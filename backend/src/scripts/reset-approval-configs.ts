import "dotenv/config";
import { executeAcademic } from "../db/pools.js";

async function run() {
  const res = await executeAcademic(
    `UPDATE ap_internal_marks_approval_configs SET approver_role_key = CASE WHEN level_number = 1 THEN 'hod' ELSE 'principal' END WHERE approver_role_key = 'superadmin'`
  );
  console.log("Database approval configs updated:", res);
  process.exit(0);
}

run().catch(console.error);
