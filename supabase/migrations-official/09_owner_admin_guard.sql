-- =========================================================
-- 09_owner_admin_guard.sql  (aditivo, idempotente)
-- Garante admin permanente para o dono da plataforma Lots BI.
-- Email: leandromajr@gmail.com
-- =========================================================

-- ---------- helpers ----------
CREATE OR REPLACE FUNCTION public.is_platform_owner(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = _user_id
      AND lower(u.email) = lower('leandromajr@gmail.com')
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_owner_admin_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.is_platform_owner(_user_id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END;
$$;

-- ---------- bootstrap: conta existente ----------
DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT u.id INTO owner_id
  FROM auth.users u
  WHERE lower(u.email) = lower('leandromajr@gmail.com')
  LIMIT 1;

  IF owner_id IS NOT NULL THEN
    PERFORM public.ensure_owner_admin_for_user(owner_id);
  END IF;
END $$;

-- ---------- signup: novo usuário dono sempre vira admin ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email))
  ON CONFLICT (id) DO NOTHING;

  PERFORM public.ensure_owner_admin_for_user(NEW.id);

  RETURN NEW;
END;
$$;

-- ---------- guard: nunca revogar admin do dono ----------
CREATE OR REPLACE FUNCTION public.guard_owner_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE'
     AND OLD.role = 'admin'
     AND public.is_platform_owner(OLD.user_id) THEN
    RAISE EXCEPTION 'Cannot revoke admin role from platform owner (leandromajr@gmail.com)';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_owner_admin_role ON public.user_roles;
CREATE TRIGGER trg_guard_owner_admin_role
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_owner_admin_role();

-- ---------- has_role: dono é sempre admin (RLS + views) ----------
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _role = 'admin'::public.app_role AND public.is_platform_owner(_user_id) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = _user_id AND role = _role
    )
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ensure_owner_admin_for_user(uuid) TO service_role;
