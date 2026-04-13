# Features – Antigravity (Odoo Project Replica)

**Source**: 18 official Odoo Project v18 tutorial videos (fully transcribed) +  
`edu-primesoft` field export (24,749 rows, verified 2026-03-26).  
**Stack**: Django 5 + DRF · React 18 · Odoo XML-RPC  
**Rule**: Every feature below maps to something **explicitly shown** in the transcripts.  
Nothing is assumed or invented.

---

## Feature Index

| # | Feature Area | Videos | Key Odoo Models |
|---|---|---|---|
| 1 | Projects | 1, 2, 3 | `project.project` |
| 2 | Task Kanban & Views | 1, 8 | `project.task`, `project.task.type` |
| 3 | Task Form | 1, 4 | `project.task` |
| 4 | Project Stages & Statuses | 2 | `project.project.stage`, `project.project` |
| 5 | Top Bar | 3 | (config on `project.project`) |
| 6 | Email & Website Form → Task | 5 | `project.project` alias fields |
| 7 | Sales Order → Project & Tasks | 6 | `project.project`, `project.task` |
| 8 | Subtasks | 7 | `project.task` (`parent_id`, `child_ids`) |
| 9 | Task Dependencies & Gantt | 8 | `depend_on_ids`, `dependent_ids` |
| 10 | Recurring Tasks | 9 | `project.task.recurrence` |
| 11 | Visibility & Collaboration | 10 | `project.collaborator`, `privacy_visibility` |
| 12 | Automations | 11 | (Studio — `base.automation`) |
| 13 | Milestones | 12 | `project.milestone` |
| 14 | Timesheets Basics | 13 | `account.analytic.line` |
| 15 | Timesheets Config & Leaderboard | 14 | `account.analytic.line` |
| 16 | Invoicing Policies | 15 | `project.project.billing_type` |
| 17 | Dashboard & Project Updates | 16 | `project.update` |
| 18 | Profitability | 17 | `account.analytic.account` |
| 19 | Customer Ratings | 18 | `rating.rating`, `project.task.type` |

---

## 1. Projects

### What the transcript shows (Video 1, 2, 3)
Creating a project prompts two immediate toggles: **Time Tracking** and **Billable**. After creation the user lands directly in Kanban view. Project cards in the global view show color, tags, allocated time, and activity icons.

### Fields used (from CSV `project.project`)

| Field | Type | Purpose |
|---|---|---|
| `name` | char | Project title (required) |
| `partner_id` | many2one → `res.partner` | Customer |
| `user_id` | many2one → `res.users` | Project Manager |
| `date_start` | date | Planned start |
| `date` | date | Deadline / Expiration |
| `color` | integer | Card color in global Kanban (0–11) |
| `tag_ids` | many2many → `project.tags` | Filtering tags |
| `allow_timesheets` | boolean | Enables time tracking on tasks |
| `allow_billable` | boolean | Enables invoicing |
| `allow_milestones` | boolean | Enables milestone tab |
| `allow_recurring_tasks` | boolean | Enables recurrent button on tasks |
| `allow_task_dependencies` | boolean | Enables Blocked By tab on tasks |
| `allow_quotations` | boolean | Enables extra quotations |
| `allow_material` | boolean | Enables products on tasks |
| `allocated_hours` | float | Total hours budget (appears only if `allow_timesheets=True`) |
| `description` | html | Rich text — supports `/` commands: checklist, image, attachment |
| `privacy_visibility` | selection | Visibility level (see Feature 11) |
| `billing_type` | selection | Invoicing policy (see Feature 16) |
| `is_template` | boolean | Project acts as a Sales Order template |
| `label_tasks` | char | Rename "Tasks" tab (e.g. "Tickets", "Requests") |
| `alias_name` | char | Email alias prefix (e.g. `walking` → `walking@yourdomain.com`) |
| `stage_id` | many2one → `project.project.stage` | Global pipeline position |

### React components needed

- `ProjectCard` — global Kanban card (color strip, name, tag chips, allocated hours, activity dot)
- `ProjectCreateModal` — name + timesheets toggle + billable toggle
- `ProjectSettingsDrawer` — all fields above, full edit form

---

## 2. Task Kanban & Views

### What the transcript shows (Video 1, 8)
Default landing view is **Kanban**. Stages are created inline ("Ideas", "Assigned", "Ongoing", "Review"). Cards support quick-actions **without opening** the task: star for priority, schedule activity, add assignee, color-code. Folding a stage hides it from the board. Done tasks become grayed out (archived, `active=False`).

Other views available: **List**, **Gantt** (dependency arrows), **Calendar** (auto-plan button).

### Fields visible on Kanban card (no task open)

| Field | Odoo field | Notes |
|---|---|---|
| Title | `name` | |
| Assignee avatar(s) | `user_ids` | many2many |
| Priority star | `priority` | `0` = normal, `1` = starred |
| Status dot | `state` | color-coded dot (see Task States table below) |
| Color bar | `color` | left-side color stripe |
| Tags | `tag_ids` | pill badges |
| Allocated vs spent hours | `allocated_hours` / `effective_hours` | shown as `X / Y h` |
| Deadline | `date_deadline` | red if overdue |
| Subtask count | `child_ids` count | checklist icon |
| Dependency blocked icon | `depend_on_ids` | shown when task is blocked |
| Activity icons | `activity_ids` | clock/phone/email icons |
| Recurrent icon | `recurring_task` | |

### Task States (`state` field — the status dot)

| `state` value | Label shown | Dot color |
|---|---|---|
| `01_in_progress` | In Progress | Grey |
| `02_changes_requested` | Changes Requested | Orange / Yellow |
| `03_approved` | Approved | Green |
| `04_waiting_normal` | Waiting | Purple (dependency blocked) |
| `1_done` | Done | — (card archived/greyed out) |
| `1_canceled` | Cancelled | — (card archived/greyed out) |

### Views to implement

| View | Library | Key behaviour |
|---|---|---|
| Kanban | `@hello-pangea/dnd` | Drag card → updates `stage_id` via PATCH `/api/tasks/{id}/move/` |
| List | HTML table + sort | Column sort by `name`, `date_deadline`, `priority`, `state` |
| Gantt | `gantt-task-react` | Shows `planned_date_begin` → `date_end`; arrows from `depend_on_ids` |
| Calendar | `react-big-calendar` | Uses `date_deadline` as event date; **Auto Plan** button |

---

## 3. Task Form

### What the transcript shows (Video 1, 4, 7, 8)
Opened by clicking a Kanban card. Contains description (rich text + checklist), tags, priority, allocated hours, deadline, and an activities section. Tabs for Subtasks, Blocked By, Timesheets, Activities all appear when the relevant project toggle is on.

### All form fields and tabs

**Header fields**
| Field | Odoo field |
|---|---|
| Title | `name` |
| Assignees | `user_ids` |
| Stage (dropdown) | `stage_id` |
| Status dot | `state` |
| Priority star | `priority` |
| Project | `project_id` |
| Customer | `partner_id` |
| Milestone | `milestone_id` (only if `allow_milestones=True`) |
| Allocated Hours | `allocated_hours` |
| Deadline | `date_deadline` |
| Start Date | `planned_date_begin` |
| Tags | `tag_ids` |
| Color | `color` |
| Recurrent toggle | `recurring_task` + `recurrence_id` |

**Body**
- `description` — TipTap rich text editor with `/` commands: checklist, bulleted list, image upload, file attachment

**Tabs** (each only visible when feature enabled on project)

| Tab | Shown when | Content |
|---|---|---|
| Subtasks | always | `child_ids` — list of subtasks, inline create |
| Blocked By | `allow_task_dependencies=True` | `depend_on_ids` + `dependent_ids` smart button |
| Timesheets | `allow_timesheets=True` | `account.analytic.line` records for this task |
| Activities | always | `mail.activity` records — schedule call, meeting, to-do |

**Smart buttons** (appear contextually)
| Button | When shown |
|---|---|
| Parent Task | `parent_id` is set (this is a subtask) |
| Blocked Tasks count | `dependent_ids` is not empty |
| Sales Order | `sale_line_id` is set |

---

## 4. Project Stages & Statuses (Global)

### What the transcript shows (Video 2)
Global project board (not task Kanban). Enabled in Settings → Project Stages. Pre-existing stages: **New, In Progress, Done, Consult**. User added **In Review**. Stages have `fold` toggle (Done and Cancelled folded by default). Moving a project to a folded stage hides it from view. Email/SMS template fires when a project enters a stage.

**Two distinct concepts:**

| Concept | Odoo model | What it means |
|---|---|---|
| Project Stage | `project.project.stage` | WHERE the project is in its lifecycle (New → Done) |
| Project Status | `project.project.last_update_status` | HOW the project is doing (On Track / At Risk / Off Track / On Hold) |

The status dot changes the **progress bar colour** at the top of the Kanban column.

### Fields on `project.project.stage`

| Field | Type | Purpose |
|---|---|---|
| `name` | char | Stage label |
| `sequence` | integer | Column order (drag to reorder) |
| `fold` | boolean | Hidden from board by default |
| `mail_template_id` | many2one | Email sent when project enters stage |
| `sms_template_id` | many2one | SMS sent when project enters stage |

### `last_update_status` values on `project.project`

| Value | Display | Progress bar colour |
|---|---|---|
| `on_track` | On Track | Green |
| `at_risk` | At Risk | Orange |
| `off_track` | Off Track | Red |
| `on_hold` | On Hold | Grey |
| `to_define` | (default, no update yet) | None |

---

## 5. Top Bar

### What the transcript shows (Video 3)
Toggled via the **sliders button** inside a project. By default only "Tasks" is shown. Additional tabs can be added: **Timesheets, Expenses, Sales Orders, Purchase Orders, Vendor Bills, Dashboard, Documents**. Each tab is a filtered view of related records. Custom filtered views can be saved and optionally shared with the team. Config is **per project** and **per user** (until shared).

### Tabs available (depends on installed apps)

| Tab | What it shows | Odoo model |
|---|---|---|
| Tasks | Project tasks Kanban/List | `project.task` |
| Timesheets | `account.analytic.line` for this project | `account.analytic.line` |
| Expenses | Expense reports linked to project | `hr.expense` |
| Sales Orders | Linked sales orders | `sale.order` |
| Purchase Orders | Linked POs | `purchase.order` |
| Vendor Bills | Linked bills | `account.move` |
| Dashboard | `project.update` + profitability | `project.update` |
| Documents | Linked documents | `documents.document` |

### Implementation note
Top bar config is stored **per-user per-project** in React state / localStorage. Shared views call `odoo_call("ir.filters", "create", [...])` to persist them.

---

## 6. Email Alias & Website Form → Task

### What the transcript shows (Video 5)
Project settings → "Create tasks by sending an email to `walking@yourdomain.com`". Any incoming email auto-creates a task in the project. Stage-level email template fires on Kanban drag-drop ("Request Acknowledgement"). Website contact form mapped to project → submission creates a task.

### Fields involved

| Field | Odoo field | Model |
|---|---|---|
| Alias prefix | `alias_name` | `project.project` |
| Full alias address | `alias_full_name` (computed) | `project.project` |
| Stage email template | `mail_template_id` | `project.task.type` |
| Stage SMS template | `sms_template_id` | `project.task.type` |

### Antigravity implementation
- `alias_name` is set on project creation via `odoo_call("project.project", "write", [[id], {"alias_name": "walking"}])`.
- Incoming email processing is handled entirely by Odoo (not by Antigravity). Antigravity only reads the resulting tasks.
- Stage template is set via `odoo_call("project.task.type", "write", [[stage_id], {"mail_template_id": template_id}])`.

---

## 7. Sales Order → Project & Tasks (+ Project Templates)

### What the transcript shows (Video 6)
Product type = Service → reveals "Create on Order" field: **Task / Project + Task / Project**. Confirm quotation → smart buttons "Projects" and "Tasks" appear instantly. **Project Template**: a real project marked `is_template=True` with pre-built stages and tasks. Linked to a product → every new sale clones the template into a fresh project with all tasks pre-created.

### Fields involved

| Field | Odoo field | Model |
|---|---|---|
| Creates on order | (on `product.template`) | `product.template` |
| Is template | `is_template` | `project.project` |
| Sales Order Item | `sale_line_id` | `project.task` |
| Auto-created project | `project_id` | `project.task` |

### Antigravity implementation
- Read-only in Antigravity — sales order creation is done in the Odoo Sales app.
- Antigravity displays the `sale_line_id` smart button on the Task form to link back.
- Template projects are fetched with domain `[["is_template", "=", True]]` for the project selector in Sales product config.

---

## 8. Subtasks

### What the transcript shows (Video 7)
Subtask count icon visible on Kanban card. Subtask tab inside task form: inline list, inline create. Subtask has its own `project_id` (can be different project or empty). If `display_in_project=True` the subtask appears in the parent project Kanban. Parent Task smart button at top of subtask form. Can mark subtask done from parent card directly.

### Fields involved

| Field | Odoo field | Notes |
|---|---|---|
| Parent task | `parent_id` | many2one → `project.task` |
| Subtask list | `child_ids` | one2many → `project.task` |
| Show in project Kanban | `display_in_project` | boolean |
| Own project | `project_id` | can differ from parent's project |

### Antigravity implementation
- Subtask count badge: `child_ids.length` on the task object.
- Inline create in subtask tab: `POST /api/tasks/` with `{ parent_id: taskId, project_id: null }`.
- Fetch subtasks: `GET /api/tasks/?parent_id={taskId}` → domain `[["parent_id", "=", taskId]]`.

---

## 9. Task Dependencies & Gantt / Calendar

### What the transcript shows (Video 8)
Enabled in Settings → Task Dependencies. Also toggleable per project (`allow_task_dependencies`). Adds **Blocked By** tab. Task status auto-changes to `04_waiting_normal` when blocked. Gantt view: dependency shown as arrow line. Tasks need `planned_date_begin` + `date_end` to appear on Gantt. Calendar view has **Auto Plan** button (factors in employee working hours, contracts, time off, public holidays).

### Fields involved

| Field | Odoo field | Notes |
|---|---|---|
| Blocked By | `depend_on_ids` | many2many → `project.task` |
| Blocks | `dependent_ids` | inverse many2many |
| Gantt start | `planned_date_begin` | datetime |
| Gantt end | `date_end` | datetime |
| Waiting state | `state = "04_waiting_normal"` | auto-set when blocked |

### Antigravity implementation
- Drag from Gantt bar to connect: creates `depend_on_ids` entry via `PATCH /api/tasks/{id}/` with `{ "depend_on_ids": [(4, blocked_by_id, 0)] }`.
- Gantt arrow data: for each task, read `depend_on_ids` → draw arrow from dependency task bar end to blocked task bar start.
- Auto Plan button → calls `odoo_call("project.task", "action_auto_schedule_tasks", [[project_id]])` (server action).

---

## 10. Recurring Tasks

### What the transcript shows (Video 9)
Enabled in Settings → Recurring Tasks. Adds **Recurrent** button next to deadline on task form. Config: interval (daily / weekly / monthly / yearly) + end condition (forever / until date). Marking task **Done** or **Cancelled** auto-creates next occurrence with same data but updated deadline. Cancelling one occurrence does **not** break the series — only clicking the recurrent icon on the **last task** and removing it breaks the series.

### Fields involved

| Field | Odoo field | Model |
|---|---|---|
| Is recurring | `recurring_task` | `project.task` |
| Recurrence record | `recurrence_id` | `project.task` → `project.task.recurrence` |
| Repeat every | `repeat_interval` | `project.task.recurrence` |
| Repeat unit | `repeat_unit` | `project.task.recurrence` (`day`/`week`/`month`/`year`) |
| End condition | `repeat_type` | `project.task.recurrence` (`forever`/`until`) |
| End date | `repeat_until` | `project.task.recurrence` |

### Antigravity implementation
- Enable recurrence: `PATCH /api/tasks/{id}/` with `{ "recurring_task": true, "repeat_interval": 1, "repeat_unit": "week", "repeat_type": "forever" }`.
- Odoo auto-creates the `project.task.recurrence` record.
- Break series: `PATCH /api/tasks/{id}/` with `{ "recurring_task": false, "recurrence_id": false }`.
- React shows **Recurrent** toggle badge on task form when `recurring_task=True`.

---

## 11. Visibility & Collaboration

### What the transcript shows (Video 10)
Three visibility levels on `privacy_visibility`. Invited portal users (external) can be granted read-only or editable access. Editable portal access: external user can drag Kanban cards, leave chatter messages, change task `state`. "All internal users" removes portal invitations. Private project: access per task (assignee or follower on task) or per project (add follower at project level).

### Privacy levels

| `privacy_visibility` value | Who can see |
|---|---|
| `followers` | Invited portal users (read or editable) + all internal users |
| `employees` | All internal users only |
| `portal` | ← **not used for restriction** — this is "Invited portal users" in the UI |

> Note: Odoo's labels in the UI do not match the field values exactly. "Invited internal users" = `followers` with no portal collaborators added.

### Collaboration fields

| Field | Odoo field | Model |
|---|---|---|
| Portal collaborators | `collaborator_ids` | `project.project` → `project.collaborator` |
| Limited access | `limited_access` | `project.collaborator` |
| Task followers | `message_follower_ids` | `project.task` |
| Project followers | `message_follower_ids` | `project.project` |

### Antigravity implementation
- Share editable: `POST /api/collaborators/` → `odoo_call("project.collaborator", "create", [{"project_id": id, "partner_id": partner_id, "limited_access": False}])`.
- Send invite email: `odoo_call("project.project", "action_share", [[project_id]])` or via chatter `mail.thread`.
- Private project task access: add follower → `odoo_call("project.task", "message_subscribe", [[task_id], [partner_id]])`.

---

## 12. Automations

### What the transcript shows (Video 11)
Accessed via gear icon on a Kanban stage → Automations. Requires **Studio** app. Each automation has a **Trigger** + one or more **Actions**.

Triggers shown:
- Tag added (e.g. "dinosaur-bones" tag added to task)
- Task moves to a stage (e.g. enters "Review" stage)

Actions shown:
- Add a follower (e.g. auto-add Monica when tag added)
- Create an activity (e.g. "Call Monica" in 2 days when task enters Review)

### Antigravity implementation
- Automations are **configured in Odoo Studio** directly — not replicated in Django.
- Antigravity reads the **result** of automations (follower added, activity created) via regular `search_read` on `mail.activity` and `mail.followers`.
- React displays the activity icons and follower avatars as normal — no special handling needed.

---

## 13. Milestones

### What the transcript shows (Video 12)
Enabled in Settings → Milestones. Per-project (not global). Each milestone has a name + optional deadline. Tasks linked to a milestone via `milestone_id`. When all linked tasks are done → milestone turns green on Dashboard → manually mark as **Reached**. Invoicing policy "Based on Milestones": each milestone = a percentage of the sales order line quantity. Reaching milestone unlocks partial invoice.

### Fields involved

| Field | Odoo field | Model |
|---|---|---|
| Milestone name | `name` | `project.milestone` |
| Deadline | `deadline` | `project.milestone` |
| Is reached | `is_reached` | `project.milestone` |
| Reached date | `reached_date` (computed) | `project.milestone` |
| % of SO qty | `quantity_percentage` | `project.milestone` |
| Linked SO line | `sale_line_id` | `project.milestone` |
| Tasks in milestone | `task_ids` | `project.milestone` |
| Task's milestone | `milestone_id` | `project.task` |

### Antigravity implementation
- Mark reached: `PATCH /api/milestones/{id}/reach/` → `odoo_call("project.milestone", "write", [[id], {"is_reached": True}])`.
- Milestone bar in Dashboard: read `is_reached` + `quantity_percentage` → render progress ring.

---

## 14. Timesheets Basics

### What the transcript shows (Video 13)
Timesheet app shows **weekly grid view** per user. Totals: green = matches working hours, red = under, black = overtime. Italic tasks = have allocated hours still unlogged. Three ways to log time:

1. **Built-in timer** (start/stop in Timesheets app) — select project + task
2. **Keyboard shortcut** — press `F` to start/stop timer on a task row
3. **Task-level** — Start button in task top bar OR manual line entry in Timesheets tab

Validation: approver set on employee form → validates team timesheets. Grid view "Validate" button or list view multi-select → Actions → Validate.

### Fields involved (all on `account.analytic.line`)

| Field | Purpose |
|---|---|
| `project_id` | Project the time is logged against |
| `task_id` | Task the time is logged against |
| `employee_id` | Who logged the time |
| `user_id` | Linked user |
| `unit_amount` | Hours logged (the core number) |
| `date` | Date of the timesheet entry |
| `name` | Description / notes |
| `validated` | Whether approver has validated it |
| `amount` | Auto-calculated cost (read-only) |
| `timesheet_invoice_type` | Billability classification (read-only) |

### Antigravity implementation
- Timer widget: `TimerWidget` component stores `startTime` in React state. On stop: `POST /api/timesheets/` with `{ unit_amount: elapsedHours, project_id, task_id, date, employee_id }`.
- Keyboard shortcut `F`: bind `keydown` event → toggles timer.
- Weekly grid: group `account.analytic.line` by `date` + `task_id` using `odoo_call("account.analytic.line", "search_read", [domain], { "group_by": ["date:day", "task_id"] })`.
- Minimum 15 min: enforce `unit_amount >= 0.25` in `TimesheetSerializer`.

---

## 15. Timesheets Configuration & Leaderboard

### What the transcript shows (Video 14)
Settings → Timesheets: encode in hours/days, minimum duration (15 min), rounding (15 min). Monthly reminders for employees + approvers. **Billing Rate Indicators** + **Leaderboard** toggle. Employee form → Settings tab → `billing_time_target` (hours/month). Two leaderboard modes: Billable Hours and Total Hours. Custom motivational tips (config → Tips).

### Features to implement in Antigravity

| Feature | Source | Implementation |
|---|---|---|
| Minimum 15 min | Config | Enforce in `TimesheetSerializer.validate_unit_amount()` |
| Leaderboard — billable hours | `account.analytic.line` grouped by `employee_id`, filtered `timesheet_invoice_type != non_billable` | `GET /api/timesheets/leaderboard/` |
| Leaderboard — total hours | `account.analytic.line` grouped by `employee_id` | Same endpoint, `?mode=total` |
| Employee target | `hr.employee` field `billing_time_target` | Read from `hr.employee` via XML-RPC |

---

## 16. Invoicing Policies

### What the transcript shows (Video 15)
Set on the **product** in Sales, flows into the project. Four policies:

| Policy | `billing_type` value | Behaviour |
|---|---|---|
| Fixed Price | (handled at SO level) | Invoice agreed amount regardless of hours logged |
| Based on Timesheets | `task_rate` or `employee_rate` | Delivered qty = hours logged; invoice actual time |
| Delivered Quantity | (handled at SO level) | Manually update delivered qty on SO line before invoicing |
| Based on Milestones | `fixed_rate` + milestones | Delivered qty = sum of `quantity_percentage` of reached milestones |

**Key behaviour**: once a Sales Order is confirmed, tasks get `sale_line_id` set. Invoicing is created from the Sales app — Antigravity displays the link only.

### Antigravity implementation
- Display `billing_type` badge on Project card and settings drawer.
- `sale_line_id` smart button on Task form links back to the Sales Order.
- No invoicing actions in Antigravity — those are handled in Odoo Sales/Accounting.

---

## 17. Dashboard & Project Updates

### What the transcript shows (Video 16)
Accessed via vertical ellipsis → Dashboard or Top Bar tab. Shows project totals (tasks, timesheets, purchase orders, vendor bills) as clickable smart buttons. Below: Milestones panel. Then: Profitability widget (Costs vs Revenues). Then: Budget. **Project Updates** = manual snapshots: title + date + status dot + progress % + rich text notes + auto-captured snapshot of all dashboard data. Previous updates stored and browsable for historical comparison. Allocated hours editable from Dashboard (goes back to `project.project.allocated_hours`).

### Fields involved (`project.update`)

| Field | Purpose |
|---|---|
| `name` | Update title (e.g. "Monthly Review") |
| `date` | Snapshot date |
| `status` | `on_track` / `at_risk` / `off_track` / `on_hold` |
| `progress` | Manual 0–100% |
| `description` | Rich text notes |
| `task_count` | Snapshot of total tasks |
| `closed_task_count` | Snapshot of done/cancelled tasks |
| `timesheet_time` | Snapshot of hours logged |
| `allocated_time` | Snapshot of allocated hours |

### React components needed
- `DashboardPage` — totals row + milestones + profitability widget + updates list
- `ProjectUpdateCard` — status badge + progress ring + notes + snapshot table
- `ProjectUpdateForm` — create new update (status, progress%, notes)

---

## 18. Profitability

### What the transcript shows (Video 17)
Requires **Analytic Accounting** enabled in Accounting settings. Every project auto-creates an `account.analytic.account`. Top Bar links (Purchase Orders, Vendor Bills, Timesheets, Sales Orders) automatically tag records with the project's analytic account. Dashboard shows:

- **Revenues**: Sales order lines → invoices → down payments
- **Costs**: Employee timesheets (hours × `hr.employee.hourly_cost`) + Purchase Orders + Vendor Bills + Expenses

Employee hourly cost set on employee form → Settings tab (`hr.employee` field).

### Antigravity implementation
- `account_id` (`many2one → account.analytic.account`) is auto-created by Odoo on project creation. Read it: `project.project.account_id`.
- Profitability data: `odoo_call("project.project", "get_profitability_items", [[project_id]])` — Odoo computes cost/revenue breakdown.
- Display: two-column widget (Costs left, Revenues right), colour-coded (green if profit, red if loss).

---

## 19. Customer Ratings

### What the transcript shows (Video 18)
Enabled in Settings → Customer Ratings. Configured **per Kanban stage** (gear icon → Edit → Rating Email Template). Default template: "Task Rating Request". When task is dragged into the configured stage, email auto-fires to the task's customer with three smiley links. Customer clicks smiley → lands in portal → leaves optional comment. Rating stored on task (`rating_last_value`). **Auto Kanban Status**: good rating → `state = "03_approved"` (green dot); neutral/negative → `state = "02_changes_requested"` (orange dot). Reporting → Customer Ratings view shows all ratings across projects/employees.

### Fields involved

| Field | Odoo field | Model |
|---|---|---|
| Rating template | `rating_template_id` | `project.task.type` |
| Rating enabled on stage | `rating_active` | `project.task.type` |
| Auto status update | `auto_validation_state` | `project.task.type` |
| Last rating value | `rating_last_value` | `project.task` |
| Rating records | `rating_ids` | `project.task` → `rating.rating` |

### Rating values
- `10` = Satisfied (happy smiley) → sets `state = "03_approved"`
- `5` = Neutral (neutral smiley) → sets `state = "02_changes_requested"`
- `1` = Dissatisfied (sad smiley) → sets `state = "02_changes_requested"`

### Antigravity implementation
- Rating email fires automatically in Odoo when task enters the configured stage — no action needed in Django.
- Antigravity reads `rating_last_value` on the task and displays a smiley badge on the Task card.
- Customer Ratings report: `GET /api/reporting/ratings/` → `odoo_call("rating.rating", "search_read", [[["res_model", "=", "project.task"]]], {"fields": ["res_id", "rating", "partner_id", "user_id", "message"]})`.

---

## Appendix — Features NOT in scope for Antigravity v1

These were mentioned in transcripts but require additional Odoo apps beyond Project:

| Feature | Requires | Decision |
|---|---|---|
| Expense tracking | `hr.expense` module | Out of scope v1 |
| Manufacturing orders in profitability | `mrp` module | Out of scope v1 |
| Employee contracts / time off in Auto Plan | `hr.leave`, `resource` module | Read-only display only |
| Website contact form setup | `website` module | Out of scope — configure in Odoo directly |
| Full Studio automations builder | `web_studio` module | Configure in Odoo directly; Antigravity reads results |
| Timesheet leaderboard tips config | `ir.config_parameter` | Out of scope v1 |
