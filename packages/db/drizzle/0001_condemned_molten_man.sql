ALTER TABLE "tasks" ADD COLUMN "position" integer;--> statement-breakpoint
-- Backfill position values: assign sequential positions per (user_id, status) based on created_at desc
WITH ranked_tasks AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id, status ORDER BY created_at DESC) - 1 AS pos
  FROM tasks
)
UPDATE tasks
SET position = ranked_tasks.pos
FROM ranked_tasks
WHERE tasks.id = ranked_tasks.id;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "position" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "tasks_user_status_position_idx" ON "tasks" USING btree ("user_id","status","position");