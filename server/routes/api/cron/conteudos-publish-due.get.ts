import { defineEventHandler } from "h3";
import { assertCronAuth } from "../../../lib/cron-auth";
import { runConteudosPublishDueCron } from "@/modules/runtime/cron-jobs.server";

/** Legado Nitro — runtime oficial é src/routes/api/cron/*.ts */
export default defineEventHandler(async (event) => {
  assertCronAuth(event);
  return runConteudosPublishDueCron();
});
