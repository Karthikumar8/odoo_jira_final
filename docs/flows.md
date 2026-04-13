# User & System Flows – Antigravity (Odoo Project Replica)

**Source**: 18 official Odoo Project v18 tutorial videos (fully transcribed).  
**Rule**: Every step maps to something explicitly shown in the transcript.  
Every API call uses the exact field name from the `edu-primesoft` CSV (24,749 rows).

---

## How to read this document

Each flow has four parts:

1. **What the user does** — exact UI actions in React (Antigravity)
2. **What Django does** — DRF view + `odoo_call()` that fires
3. **What Odoo does** — the model + method + field that changes
4. **What React does after** — state update / UI change

Flows are ordered by the video sequence so they match your `features.md`.

---

## Flow Index

| # | Flow | Video | Complexity |
|---|---|---|---|
| 1 | Create Project → First Task → Mark Done | 1 | Core |
| 2 | Configure Project Stages & Set Status | 2 | Core |
| 3 | Customize Project (settings, top bar, color) | 3 | Core |
| 4 | Email Alias → Auto Task → Stage Email | 5 | Integration |
| 5 | Sales Order → Auto Project + Tasks (Template) | 6 | Integration |
| 6 | Create Subtask → Display in Project | 7 | Core |
| 7 | Task Dependencies → Gantt → Auto Plan | 8 | Core |
| 8 | Recurring Task → Complete → Next Occurrence | 9 | Core |
| 9 | Visibility → Portal Invite → Collaborator Edits | 10 | Collaboration |
| 10 | Automation: Tag Added → Add Follower + Activity | 11 | Automation |
| 11 | Milestones → Reached → Partial Invoice | 12 | Finance |
| 12 | Log Timesheet (Timer / Manual / Task tab) | 13 | Core |
| 13 | Validate Timesheets → Leaderboard | 14 | Management |
| 14 | Sales Order → Invoicing by Policy | 15 | Finance |
| 15 | Dashboard → Project Update Snapshot | 16 | Reporting |
| 16 | Profitability: Costs + Revenues | 17 | Finance |
| 17 | Customer Rating → Auto Status Update | 18 | Collaboration |

---

## Flow 1 — Create Project → First Task → Mark Done

**Source**: Video 1 – *Project basics and your first task*

### 1.1 Create the Project

**User does**:
- Clicks **New Project** on global Kanban
- Types project name: `"Fossil Exhibition"`
- Toggles **Time Tracking** ON, leaves **Billable** OFF
- Clicks **Create**

**Django does**:
```python
# POST /api/projects/
odoo_call("project.project", "create", [{
    "name": "Fossil Exhibition",
    "allow_timesheets": True,
    "allow_billable": False,
}])
# Returns: new project id (e.g. 42)
```

**Odoo does**:
- Creates `project.project` record id=42
- Auto-creates `account.analytic.account` linked via `account_id`
- Auto-creates `mail.alias` linked via `alias_id`
- Sets `privacy_visibility = "employees"` (default)
- Sets `last_update_status = "to_define"` (default)

**React does**:
- Navigates to `/projects/42` (Kanban view)
- Renders empty board with stage input prompt

---

### 1.2 Create Kanban Stages

**User does**:
- Clicks **+** column header → types `"Ideas"` → Enter
- Repeats for `"Assigned"`, `"Ongoing"`, `"Review"`

**Django does** (once per stage):
```python
# POST /api/stages/
odoo_call("project.task.type", "create", [{
    "name": "Ideas",          # or Assigned / Ongoing / Review
    "project_ids": [(4, 42, 0)],   # link to project 42 without replacing others
    "sequence": 10,           # 10, 20, 30, 40 for ordering
    "fold": False,
}])
# Returns: stage id (e.g. 101, 102, 103, 104)
```

**React does**:
- Renders four `StageColumn` components side by side
- Each column shows stage name + empty task area

---

### 1.3 Create First Task (from Kanban)

**User does**:
- Clicks **New** inside the Ideas column
- Types title: `"Find a Consultant"`
- Types assignee: `"Dina"` → selects from dropdown
- Presses Enter (or clicks Add)

**Django does**:
```python
# POST /api/tasks/
odoo_call("project.task", "create", [{
    "name": "Find a Consultant",
    "project_id": 42,
    "stage_id": 101,           # Ideas stage id
    "user_ids": [(4, dina_uid, 0)],
}])
# Returns: task id (e.g. 201)
```

**React does**:
- Adds `TaskCard` to Ideas column immediately (optimistic)
- Focuses on next task input (Odoo prompts for another task)

---

### 1.4 Quick Actions on Kanban Card (without opening)

**User does** (all on the card, no modal opened):
- Clicks ⭐ → sets high priority
- Clicks 👤+ → adds another assignee
- Clicks 🎨 → picks purple color
- Clicks 📅 activity icon → schedules activity directly from card

**Django does** (each is a separate PATCH):
```python
# PATCH /api/tasks/201/ — priority
odoo_call("project.task", "write", [[201], {"priority": "1"}])

# PATCH /api/tasks/201/ — add assignee (add, not replace)
odoo_call("project.task", "write", [[201], {"user_ids": [(4, other_uid, 0)]}])

# PATCH /api/tasks/201/ — color
odoo_call("project.task", "write", [[201], {"color": 4}])   # 4 = purple
```

---

### 1.5 Open Task → Fill Form

**User does**:
- Clicks card to open task modal/drawer
- Adds description checklist: "Select top 3 consultants", "Call them", "Ask for rates"
- Adds tag: `"Urgent"`
- Sets **Allocated Hours**: `6`
- Sets **Deadline**: next Friday
- Schedules activity: Call → "Professor Digs" → due tomorrow

**Django does**:
```python
# PATCH /api/tasks/201/
odoo_call("project.task", "write", [[201], {
    "description": "<ul class='o_checklist'><li>Select top 3 consultants</li>"
                   "<li>Call them</li><li>Ask for rates</li></ul>",
    "tag_ids": [(4, urgent_tag_id, 0)],
    "allocated_hours": 6.0,
    "date_deadline": "2026-04-04 17:00:00",
}])

# POST /api/activities/  (schedule the call activity)
odoo_call("mail.activity", "create", [{
    "res_model": "project.task",
    "res_id": 201,
    "activity_type_id": call_type_id,   # mail.activity.type for "Call"
    "user_id": current_uid,
    "date_deadline": "2026-03-29",
    "note": "Call Professor Digs",
}])
```

---

### 1.6 Drag Task to Ongoing → Set Status → Move to Review → Mark Done

**User does**:
- Drags card from `Ideas` → `Ongoing`
- Clicks status dot → selects **Changes Requested**
- *(negotiation happens, rate agreed)*
- Clicks status dot → selects **Approved**
- Drags card `Ongoing` → `Review`
- Opens task → clicks **Mark as Done**

**Django does** (in sequence):
```python
# 1. Kanban drag → stage change
# PATCH /api/tasks/201/move/
odoo_call("project.task", "write", [[201], {"stage_id": 103}])   # Ongoing

# 2. Status → Changes Requested
# PATCH /api/tasks/201/
odoo_call("project.task", "write", [[201], {"state": "02_changes_requested"}])

# 3. Status → Approved
odoo_call("project.task", "write", [[201], {"state": "03_approved"}])

# 4. Drag to Review
odoo_call("project.task", "write", [[201], {"stage_id": 104}])   # Review

# 5. Mark as Done — archives the task
odoo_call("project.task", "write", [[201], {
    "state": "1_done",
    "active": False,    # Odoo archives it automatically on done
}])
```

**React does**:
- Step 2: card gets orange/yellow exclamation icon + column header turns yellow
- Step 3: card dot turns green
- Step 5: card greys out (opacity 0.5) — still visible in column but clearly archived

---

### 1.7 Fold a Stage

**User does**:
- Clicks `⋯` on Review column header → **Fold**

**Django does**:
```python
# PATCH /api/stages/104/
odoo_call("project.task.type", "write", [[104], {"fold": True}])
```

**React does**:
- Collapses column to narrow strip showing only stage name + task count

---

## Flow 2 — Configure Project Stages & Set Status

**Source**: Video 2 – *Project stages and status*

### 2.1 Enable Global Project Stages (one-time setup)

This is a Settings toggle — configured in Odoo directly, not in Antigravity UI. Antigravity reads the result.

```python
# Read all global project stages
# GET /api/project-stages/
odoo_call("project.project.stage", "search_read", [[]], {
    "fields": ["id", "name", "sequence", "fold", "color",
               "mail_template_id", "sms_template_id"],
    "order": "sequence asc",
})
```

---

### 2.2 Move Project to a Global Stage

**User does**:
- On global Kanban, drags project card from `New` → `In Progress`

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "stage_id": in_progress_stage_id,
}])
# If stage has mail_template_id set → Odoo auto-sends the email
```

---

### 2.3 Set Project Status Dot

**User does**:
- Clicks the status dot on a project card
- Selects **At Risk**

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "last_update_status": "at_risk",
}])
```

**React does**:
- Dot turns orange
- Column progress bar for `In Progress` stage updates colour to orange

---

## Flow 3 — Customize Project

**Source**: Video 3 – *Customize your project*

### 3.1 Edit Project Settings

**User does**:
- Opens project → clicks **⚙ Settings** tab
- Changes: Customer → `Dino City`, adds tag `External`, sets dates, allocates `100h`, renames tasks label to `"Tickets"`, picks color

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "partner_id": dino_city_partner_id,
    "tag_ids": [(4, external_tag_id, 0)],
    "date_start": "2026-04-01",
    "date": "2026-06-30",
    "allocated_hours": 100.0,
    "label_tasks": "Tickets",
    "color": 3,
}])
```

---

### 3.2 Add Top Bar Tabs

**User does**:
- Clicks sliders icon → **Add** → ticks: Timesheets, Expenses, Dashboard

**Django does**:
This is a local React preference. No dedicated Odoo model for top bar config. Store in user's browser state or `ir.config_parameter` if persistence is needed.

```python
# Optional: persist top bar config per user per project
# Not an Odoo core field — store in React localStorage or
# use a custom field on project.project if needed.
```

**React does**:
- Renders new tabs: `Tasks | Timesheets | Expenses | Dashboard`
- Each tab fetches from its respective DRF endpoint on click

---

### 3.3 Save a Custom Filtered View

**User does**:
- On Timesheets tab → adds filter **Validated = Yes**
- Clicks sliders → **Save View** → names it `"Validated Timesheets"` → toggles **Share**

**Django does**:
```python
# POST — save as Odoo filter (ir.filters)
odoo_call("ir.filters", "create", [{
    "name": "Validated Timesheets",
    "model_id": "account.analytic.line",
    "domain": '[["validated","=",True],["project_id","=",42]]',
    "user_id": current_uid if not shared else False,  # False = shared to all
    "context": "{}",
}])
```

---

## Flow 4 — Email Alias → Auto Task → Stage Email

**Source**: Video 5 – *Creating tasks from emails & web forms*

### 4.1 Set Email Alias on Project

**User does**:
- Project Settings → fills **Email alias**: `walking`

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "alias_name": "walking",
}])
# Result: walking@yourdomain.com → creates task in project 42
```

---

### 4.2 Incoming Email Creates Task

This happens fully in Odoo — Antigravity just reads the result.

```python
# Poll for new tasks (or use webhook if Odoo sends one)
# GET /api/tasks/?project_id=42&order=create_date+desc&limit=20
odoo_call("project.task", "search_read",
    [[["project_id", "=", 42], ["active", "=", True]]],
    {"fields": TASK_FIELDS, "order": "create_date desc", "limit": 20}
)
```

**React does**:
- New `TaskCard` appears in the first stage (Ideas / Incoming)
- Subject line of email becomes `task.name`
- Email body becomes `task.description`

---

### 4.3 Set Stage Email Template (fires on Kanban move)

**User does**:
- Clicks ⚙ on stage column → **Edit**
- Selects **Email Template**: `"Request Acknowledgement"`

**Django does**:
```python
# PATCH /api/stages/101/
odoo_call("project.task.type", "write", [[101], {
    "mail_template_id": request_ack_template_id,
}])
```

**On drag into that stage** → Odoo auto-sends the email to `task.partner_id`. No extra call needed from Antigravity.

---

## Flow 5 — Sales Order → Auto Project + Tasks (Project Template)

**Source**: Video 6 – *Creating tasks from sales orders & Project templates*

### 5.1 Read Template Projects

```python
# GET /api/projects/?is_template=true
odoo_call("project.project", "search_read",
    [[["is_template", "=", True], ["active", "=", True]]],
    {"fields": ["id", "name"], "order": "name asc"}
)
```

### 5.2 After SO Confirmed — Read Auto-Created Project & Tasks

Sales order confirmation and project creation happen in Odoo Sales app. Antigravity reads the result.

```python
# Find project created from SO (linked via sale_line_id on tasks)
odoo_call("project.project", "search_read",
    [[["sale_line_id", "!=", False], ["active", "=", True]]],
    {"fields": PROJECT_FIELDS, "order": "create_date desc", "limit": 1}
)

# Read auto-created tasks in that project
odoo_call("project.task", "search_read",
    [[["project_id", "=", new_project_id], ["active", "=", True]]],
    {"fields": TASK_FIELDS, "order": "sequence asc"}
)
```

**React does**:
- Smart button **Sales Order** appears on each task form (from `task.sale_line_id`)
- Smart button **Project** appears on the SO page (read-only link to Antigravity project view)

---

## Flow 6 — Create Subtask → Display in Project

**Source**: Video 7 – *Subtasks*

### 6.1 Create Subtask from Task Form

**User does**:
- Opens task 201 → **Subtasks** tab → **Add a line**
- Types: `"Send Invites"` → sets priority ⭐ → sets assignee

**Django does**:
```python
# POST /api/tasks/
odoo_call("project.task", "create", [{
    "name": "Send Invites",
    "parent_id": 201,           # links to parent task
    "project_id": False,        # subtask is NOT in project Kanban by default
    "user_ids": [(4, dina_uid, 0)],
    "priority": "1",
}])
# Returns: subtask id (e.g. 301)
```

---

### 6.2 Make Subtask Visible in Parent Project Kanban

**User does**:
- Opens subtask 301 → sets **Project** field to `"Jurassic Walks"` (project 42)

**Django does**:
```python
# PATCH /api/tasks/301/
odoo_call("project.task", "write", [[301], {
    "project_id": 42,
    "display_in_project": True,   # makes it appear in project Kanban
}])
```

**React does**:
- Subtask 301 appears in the project Kanban as a standalone card
- Parent task 201 card shows subtask count badge: `✓ 1`
- Subtask card shows **Parent Task** smart button at top

---

### 6.3 Mark Subtask Done from Parent Card

**User does**:
- On parent task 201 card → clicks subtask checklist row → ticks "Send Invites"

**Django does**:
```python
# PATCH /api/tasks/301/
odoo_call("project.task", "write", [[301], {
    "state": "1_done",
    "active": False,
}])
```

---

## Flow 7 — Task Dependencies → Gantt → Auto Plan

**Source**: Video 8 – *Task dependencies*

### 7.1 Enable Dependencies on Project

**User does**:
- Project Settings → toggles **Task Dependencies** ON

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "allow_task_dependencies": True,
}])
```

**React does**:
- **Blocked By** tab appears on all task forms in project 42

---

### 7.2 Add a Dependency

**User does**:
- Opens task `"Registration"` (id=401) → **Blocked By** tab → **Add a line** → picks task `"Invitations"` (id=402)

**Django does**:
```python
# PATCH /api/tasks/401/
odoo_call("project.task", "write", [[401], {
    "depend_on_ids": [(4, 402, 0)],   # add without replacing others
}])
```

**Odoo does**:
- Sets `task 401.state = "04_waiting_normal"` automatically
- `task 402.dependent_ids` now includes 401 (inverse — read-only)

**React does**:
- Task 401 Kanban card shows purple blocked icon
- Task 402 shows smart button: "Blocks 1 task"

---

### 7.3 Gantt View — Create Task by Clicking Timeline

**User does**:
- Switches to Gantt view
- Clicks on the timeline grid → creates new task at that time position

**Django does**:
```python
# POST /api/tasks/
odoo_call("project.task", "create", [{
    "name": "Bar Preparation",
    "project_id": 42,
    "planned_date_begin": "2026-04-14 09:00:00",
    "date_end": "2026-04-14 17:00:00",
}])
```

---

### 7.4 Gantt View — Draw Dependency Arrow

**User does**:
- Hovers end of task A bar → sees red dot → drags to task B bar

**Django does**:
```python
# PATCH /api/tasks/{task_b_id}/
odoo_call("project.task", "write", [[task_b_id], {
    "depend_on_ids": [(4, task_a_id, 0)],
}])
```

**React (gantt-task-react)**:
- Renders arrow line from right edge of task A → left edge of task B
- Arrow data built from `depend_on_ids` list on each task

---

### 7.5 Calendar View — Auto Plan

**User does**:
- Switches to Calendar view → clicks **Auto Plan**

**Django does**:
```python
# Server action — schedules tasks respecting employee working hours,
# contracts, time off, public holidays
odoo_call("project.task", "action_auto_schedule_tasks",
    [[project_id]], {})
# Odoo sets planned_date_begin + date_end on unscheduled tasks
```

**React does**:
- Re-fetches all tasks after call
- Calendar events now have start/end dates populated

---

## Flow 8 — Recurring Task → Complete → Next Occurrence

**Source**: Video 9 – *Recurring tasks*

### 8.1 Make a Task Recurring

**User does**:
- Opens task `"Fossil Digging Workshop"` (id=501)
- Clicks **Recurrent** button next to deadline
- Sets: deadline `Saturday 18th at 14:00`, repeat `Weekly`, end `Forever`

**Django does**:
```python
# PATCH /api/tasks/501/
odoo_call("project.task", "write", [[501], {
    "recurring_task": True,
    "date_deadline": "2026-04-18 14:00:00",
    "repeat_interval": 1,
    "repeat_unit": "week",
    "repeat_type": "forever",
}])
# Odoo auto-creates project.task.recurrence record → sets recurrence_id on task
```

**React does**:
- Recurrent icon 🔄 appears on task card
- Task form shows recurrence summary: "Every week, forever"

---

### 8.2 Mark Recurring Task Done → Next Occurrence Auto-Created

**User does**:
- Clicks **Mark as Done** on task 501

**Django does**:
```python
# PATCH /api/tasks/501/
odoo_call("project.task", "write", [[501], {
    "state": "1_done",
    "active": False,
}])
# Odoo automatically creates new task 502 with:
# - same name, assignees, description, tags
# - date_deadline shifted by 1 week (Saturday next week at 14:00)
# - recurring_task = True, recurrence_id = same recurrence record
```

**React does**:
- Task 501 greys out (archived)
- Task 502 appears in Kanban (same stage) with next Saturday's deadline
- Re-fetch: `GET /api/tasks/?project_id=42` returns 502

---

### 8.3 Break the Recurrence Series

**User does**:
- Opens the **last task** in the series (502)
- Clicks **Recurrent** icon → removes it → saves

**Django does**:
```python
# PATCH /api/tasks/502/
odoo_call("project.task", "write", [[502], {
    "recurring_task": False,
    "recurrence_id": False,
}])
# Odoo unlinks the recurrence — no more tasks will be auto-created
```

---

## Flow 9 — Visibility → Portal Invite → Collaborator Edits

**Source**: Video 10 – *Visibility and collaboration*

### 9.1 Set Project to "Invited Portal Users" + Share Editable

**User does**:
- Project Settings → Visibility: **Invited portal users (editable)**
- Clicks **Share → Invite** → types Joe's email → sends

**Django does**:
```python
# 1. Set visibility
odoo_call("project.project", "write", [[42], {
    "privacy_visibility": "followers",
}])

# 2. Create collaborator record
odoo_call("project.collaborator", "create", [{
    "project_id": 42,
    "partner_id": joe_partner_id,
    "limited_access": False,   # editable (not read-only)
}])

# 3. Send invite email (Odoo mail thread)
odoo_call("project.project", "message_subscribe",
    [[42], [joe_partner_id]], {})
# Odoo sends portal invite email automatically
```

---

### 9.2 Portal User Actions (Antigravity reads result)

Joe (external) can via the portal:
- Drag task cards between Kanban stages → creates `write` on `stage_id`
- Leave chatter message → creates `mail.message`
- Change task state (e.g. Approve) → creates `write` on `state`

All of these are handled by Odoo's portal. Antigravity fetches the updated task state via:

```python
# GET /api/tasks/201/ — re-read after portal user action
odoo_call("project.task", "read", [[201]], {"fields": TASK_FIELDS})
```

---

### 9.3 Set Project to "Invited Internal Users" (Private)

**User does**:
- Project Settings → Visibility: **Invited internal users**

**Django does**:
```python
odoo_call("project.project", "write", [[42], {
    "privacy_visibility": "followers",
    # All existing portal collaborators lose access automatically
}])
```

### 9.4 Grant One Colleague Access to One Task (not whole project)

**User does**:
- Opens task 201 → **Followers** section → Add follower → picks Dina

**Django does**:
```python
odoo_call("project.task", "message_subscribe",
    [[201], [dina_partner_id]], {})
```

---

## Flow 10 — Automation: Tag Added → Add Follower + Activity

**Source**: Video 11 – *Automations*

Automations are **configured in Odoo Studio** — not built in Antigravity. Antigravity reads the results.

### 10.1 Tag Added → Monica Auto-Added as Follower

**User does** (in Antigravity):
- Opens task → adds tag `"dinosaur-bones"`

**Django does**:
```python
# PATCH /api/tasks/201/
odoo_call("project.task", "write", [[201], {
    "tag_ids": [(4, dinosaur_bones_tag_id, 0)],
}])
# Odoo automation fires server-side:
# → adds Monica as follower (message_subscribe)
```

**React does** (after re-fetch):
```python
# GET /api/tasks/201/ → read activity_ids and followers
odoo_call("project.task", "read", [[201]], {
    "fields": ["activity_ids", "message_follower_ids"]
})
```
- Monica's avatar appears in followers section
- No extra API call from Antigravity needed — Odoo did it

---

### 10.2 Task Enters Review Stage → "Call Monica" Activity Created

**User does**:
- Drags task into **Review** stage

**Django does**:
```python
# PATCH /api/tasks/201/move/
odoo_call("project.task", "write", [[201], {"stage_id": review_stage_id}])
# Odoo automation fires server-side:
# → creates mail.activity: type=Call, title="Call Monica", due=+2 days
```

**React does** (after re-fetch):
- Phone icon 📞 appears on task card
- Activity panel inside task shows "Call Monica — due in 2 days"

---

## Flow 11 — Milestones → Reached → Partial Invoice

**Source**: Video 12 – *Milestones*

### 11.1 Create Milestones

**User does**:
- Project → vertical ellipsis → **Milestones** → **New**
- Creates: `"Booking the Venue"` (deadline optional), `"Rehearsal Dinner"`

**Django does**:
```python
# POST /api/milestones/  (twice)
odoo_call("project.milestone", "create", [{
    "name": "Booking the Venue",
    "project_id": 42,
    "deadline": "2026-05-01",
    "quantity_percentage": 50.0,   # for milestone-based invoicing
}])
odoo_call("project.milestone", "create", [{
    "name": "Rehearsal Dinner",
    "project_id": 42,
    "quantity_percentage": 50.0,
}])
```

---

### 11.2 Link Tasks to Milestone

**User does**:
- Opens task `"Venue Short List"` → sets **Milestone** field to `"Booking the Venue"`
- Repeats for `"Venue Visits"` and `"Venue Selection"`

**Django does** (once per task):
```python
# PATCH /api/tasks/{task_id}/
odoo_call("project.task", "write", [[task_id], {
    "milestone_id": venue_milestone_id,
}])
```

---

### 11.3 All Tasks Done → Mark Milestone Reached

**User does**:
- Dashboard → Milestones panel → `"Booking the Venue"` turns green → clicks **Mark as Reached**

**Django does**:
```python
# PATCH /api/milestones/{venue_milestone_id}/reach/
odoo_call("project.milestone", "write", [[venue_milestone_id], {
    "is_reached": True,
}])
# Odoo sets reached_date = today automatically
# If billing_type = milestones → SO line delivered qty updated to 0.5 (50%)
```

**React does**:
- Milestone card turns green ✅
- Dashboard shows 50% delivered on profitability widget

---

## Flow 12 — Log Timesheet (Timer / Manual / Task Tab)

**Source**: Video 13 – *Timesheets basics*

### 12.1 Method A: Built-in Timer (Timesheets app)

**User does**:
- Opens Timesheets app → clicks ▶ Start → selects project `"Wedding Planning"` + task `"Venue Selection"` → adds note `"Calling the venue"` → clicks ⏹ Stop

**Django does**:
```python
# POST /api/timesheets/
odoo_call("account.analytic.line", "create", [{
    "date": "2026-03-28",
    "project_id": 42,
    "task_id": 201,
    "employee_id": current_employee_id,
    "unit_amount": 1.5,       # hours elapsed (timer stopped at 1h30)
    "name": "Calling the venue",
}])
# Returns: timesheet id (e.g. 601)
# Odoo auto-sets: amount = unit_amount × employee.hourly_cost
```

**React (TimerWidget)**:
- Stores `startTime = Date.now()` in state on Start
- On Stop: `elapsedHours = (Date.now() - startTime) / 3600000`
- Round to nearest 0.25 (15 min minimum) in serializer

---

### 12.2 Method B: Keyboard Shortcut (press F)

**User does**:
- Hover over task row in Timesheets grid → press `F` → timer starts
- Press `F` again → timer stops

**React does**:
- `useEffect` binds `keydown` listener → checks if `e.key === "f"`
- Same `TimerWidget` logic as Method A, but tied to hovered task row

---

### 12.3 Method C: Manual Entry in Task → Timesheets Tab

**User does**:
- Opens task 201 → **Timesheets** tab → **Add a line**
- Fills: Date, Description `"Working very hard"`, Hours `1.0`

**Django does**:
```python
# POST /api/timesheets/
odoo_call("account.analytic.line", "create", [{
    "date": "2026-03-28",
    "project_id": 42,
    "task_id": 201,
    "employee_id": current_employee_id,
    "unit_amount": 1.0,
    "name": "Working very hard",
}])
```

**React does**:
- New row appears in Timesheets tab
- Task card updates `effective_hours` badge (re-fetch task)

---

### 12.4 Validate Team Timesheets

**User does**:
- Timesheets app → **To Validate** → selects period (last month)
- Reviews entries → edits one: changes Mike's entry from 10h → 9h
- Grid view → clicks **Validate** (approves all)

**Django does**:
```python
# 1. Edit entry before validation
odoo_call("account.analytic.line", "write", [[entry_id], {
    "unit_amount": 9.0,
}])

# 2. Validate all pending timesheets for the period
# Odoo server action — validates all entries where approver = current user
odoo_call("account.analytic.line", "action_validate_timesheet",
    [[entry_id_1, entry_id_2, entry_id_3]], {})
# Sets validated = True on each entry
```

---

## Flow 13 — Validate Timesheets → Leaderboard

**Source**: Video 14 – *Timesheets: Configuration & Leaderboard*

### 13.1 Fetch Leaderboard Data

```python
# GET /api/timesheets/leaderboard/?mode=billable
# Billable hours leaderboard
odoo_call("account.analytic.line", "read_group",
    [[["timesheet_invoice_type", "!=", "non_billable"],
      ["date", ">=", "2026-03-01"],
      ["date", "<=", "2026-03-31"]]],
    ["employee_id", "unit_amount:sum"],
    ["employee_id"],
    {"orderby": "unit_amount desc", "limit": 10}
)

# GET /api/timesheets/leaderboard/?mode=total
# Total hours leaderboard (all timesheets)
odoo_call("account.analytic.line", "read_group",
    [[["date", ">=", "2026-03-01"],
      ["date", "<=", "2026-03-31"]]],
    ["employee_id", "unit_amount:sum"],
    ["employee_id"],
    {"orderby": "unit_amount desc", "limit": 10}
)
```

**React does**:
- `LeaderboardWidget` renders ranked list with employee avatars + hour bars
- Toggle button switches between Billable and Total mode

---

## Flow 14 — Sales Order → Invoicing by Policy

**Source**: Video 15 – *Invoicing project tasks*

Invoicing is done in Odoo Sales/Accounting. Antigravity displays billing context only.

### 14.1 Read Task Billing Context

```python
# GET /api/tasks/201/
# Check sale_line_id and project billing_type to show correct badge
odoo_call("project.task", "read", [[201]], {
    "fields": ["sale_line_id", "allocated_hours", "effective_hours",
               "timesheet_invoice_type"]
})
```

**React does**:
- Task form shows billing badge: `Fixed Price` / `Timesheets` / `Delivered Qty` / `Milestones`
- If `timesheet_invoice_type = "non_billable"` → timesheet rows show grey tag
- If `timesheet_invoice_type = "billable_time"` → rows show blue "Billable" tag

### 14.2 Policy behaviour summary

| `billing_type` | What Odoo invoices | Antigravity shows |
|---|---|---|
| Fixed price | Agreed SO qty (e.g. 20h) regardless of `effective_hours` | Warning badge if `effective_hours > allocated_hours` (overtime) |
| Timesheets | Actual `effective_hours` | Green if under budget, red if over |
| Delivered qty | Manually updated SO line qty | `sale_line_id` link + read-only qty |
| Milestones | `quantity_percentage` of reached milestones | Milestone progress ring |

---

## Flow 15 — Dashboard → Project Update Snapshot

**Source**: Video 16 – *Dashboard*

### 15.1 Load Dashboard

**User does**:
- Clicks **Dashboard** tab in top bar (or vertical ellipsis → Dashboard)

**Django does**:
```python
# GET /api/projects/42/dashboard/
# 1. Project totals
odoo_call("project.project", "read", [[42]], {
    "fields": ["allocated_hours", "last_update_status",
               "last_update_id", "milestone_ids"]
})

# 2. Timesheets summary for project
odoo_call("account.analytic.line", "read_group",
    [[["project_id", "=", 42]]],
    ["unit_amount:sum"],
    []
)

# 3. Most recent update
odoo_call("project.update", "search_read",
    [[["project_id", "=", 42]]],
    {"fields": UPDATE_FIELDS, "order": "date desc", "limit": 5}
)
```

---

### 15.2 Create a Project Update (Monthly Snapshot)

**User does**:
- Dashboard → **New Update** → fills: title `"Monthly Review"`, status `On Track`, progress `70%`, notes `"We're doing great"`

**Django does**:
```python
# POST /api/updates/
odoo_call("project.update", "create", [{
    "name": "Monthly Review",
    "project_id": 42,
    "user_id": current_uid,
    "date": "2026-03-28",
    "status": "on_track",
    "progress": 70,
    "description": "<p>We're doing great</p>",
}])
# Odoo auto-captures snapshot:
# task_count, closed_task_count, timesheet_time, allocated_time
```

**React does**:
- New `ProjectUpdateCard` appears at top of updates list
- Shows: status badge (green On Track), progress ring (70%), notes, snapshot table
- Previous updates shift down → historical comparison available

---

### 15.3 Edit Allocated Hours from Dashboard

**User does**:
- Dashboard → allocated hours widget → clicks to edit → changes `15h → 20h`

**Django does**:
```python
# PATCH /api/projects/42/
odoo_call("project.project", "write", [[42], {
    "allocated_hours": 20.0,
}])
```

**React does**:
- Dashboard totals row re-renders immediately with new allocated hours
- Timesheets widget updates remaining hours calculation

---

## Flow 16 — Profitability: Costs + Revenues

**Source**: Video 17 – *Measuring project's profitability*

### 16.1 Load Profitability Data

**Django does**:
```python
# GET /api/projects/42/profitability/
# Odoo computes costs + revenues from the analytic account
odoo_call("project.project", "get_profitability_items",
    [[42]], {"with_action": False})
# Returns:
# costs: [{ id, name, uom, billed, to_bill }, ...]  (timesheets, POs, bills, expenses)
# revenues: [{ id, name, uom, invoiced, to_invoice }, ...]  (SO lines, invoices)
```

**React does**:
- Two-column layout: **Costs** (left) | **Revenues** (right)
- Each row: category name + amounts
- Bottom total: green if revenue > cost, red if loss
- Cost breakdown includes:
  - Employee timesheets: `unit_amount × hr.employee.hourly_cost`
  - Purchase orders
  - Vendor bills
  - Expenses

---

### 16.2 Read Employee Hourly Cost (for display only)

```python
# GET /api/employees/{employee_id}/
odoo_call("hr.employee", "read", [[employee_id]], {
    "fields": ["id", "name", "timesheet_cost"]   # field: hourly_cost
})
```

---

## Flow 17 — Customer Rating → Auto Status Update

**Source**: Video 18 – *Customer ratings*

### 17.1 Configure Rating on Stage

**User does**:
- Gear on `"Feedback"` stage → Edit → selects **Rating Email Template**: `"Task Rating Request"` → enables **Automatic Kanban Status**

**Django does**:
```python
# PATCH /api/stages/{feedback_stage_id}/
odoo_call("project.task.type", "write", [[feedback_stage_id], {
    "rating_active": True,
    "rating_template_id": task_rating_template_id,
    "auto_validation_state": True,
    "rating_status": "stage",
}])
```

---

### 17.2 Task Dragged to Feedback Stage → Email Fires

**User does**:
- Drags task into **Feedback** stage

**Django does**:
```python
# PATCH /api/tasks/201/move/
odoo_call("project.task", "write", [[201], {
    "stage_id": feedback_stage_id,
}])
# Odoo auto-fires rating email to task.partner_id
# No extra call from Antigravity needed
```

---

### 17.3 Customer Submits Rating → Task Status Auto-Updates

This happens in Odoo portal — Antigravity reads the result.

```python
# Poll / re-fetch after rating submitted
# GET /api/tasks/201/
odoo_call("project.task", "read", [[201]], {
    "fields": ["state", "rating_last_value"]
})
# rating_last_value = 10 → state = "03_approved"   (green dot, satisfied)
# rating_last_value = 5  → state = "02_changes_requested" (orange, neutral)
# rating_last_value = 1  → state = "02_changes_requested" (orange, dissatisfied)
```

**React does**:
- Status dot updates to green (approved) or orange (changes requested)
- Smiley badge appears on task card: 😊 / 😐 / 😞
- Chatter shows customer's comment

---

### 17.4 Customer Ratings Report

**User does**:
- Reporting menu → **Customer Ratings**

**Django does**:
```python
# GET /api/reporting/ratings/
odoo_call("rating.rating", "search_read",
    [[["res_model", "=", "project.task"]]],
    {
        "fields": ["res_id", "res_name", "rating", "partner_id",
                   "user_id", "message", "create_date"],
        "order": "create_date desc",
    }
)
```

**React does**:
- Table/list: task name, customer, rating smiley, assignee, comment, date
- Filter by project, date range, assignee

---

## Appendix — API Error Handling Pattern

Every flow above should wrap `odoo_call()` in this pattern:

```python
# services/odoo_client.py
import xmlrpc.client
import logging

logger = logging.getLogger(__name__)

def odoo_call(model, method, args, kwargs=None):
    try:
        result = models.execute_kw(
            ODOO_DB, uid, ODOO_API_KEY,
            model, method, args, kwargs or {}
        )
        return result
    except xmlrpc.client.Fault as e:
        # Odoo business logic error (e.g. required field missing, access denied)
        logger.error("Odoo Fault %s.%s: %s", model, method, e.faultString)
        raise OdooBusinessError(e.faultString) from e
    except Exception as e:
        # Network / connection error
        logger.error("Odoo connection error %s.%s: %s", model, method, str(e))
        raise OdooConnectionError(str(e)) from e
```

### Common Odoo error codes to handle in React

| Situation | Odoo fault | React response |
|---|---|---|
| Required field missing | `ValidationError` | Highlight the field in red |
| No write access | `AccessError` | Show "You don't have permission" toast |
| Record not found | `MissingError` | Remove card from UI + toast |
| Concurrent write | `ConcurrentUpdate` | Re-fetch + show "Updated by someone else" |
