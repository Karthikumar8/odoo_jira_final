# Skill: `project.task` — Antigravity

**Odoo model**: `project.task`  
**CSV source**: `edu-primesoft` — 206 fields verified (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC  
**Rule**: Every field name below is the exact Odoo API name. Use it verbatim in `search_read`, `create`, and `write` calls.

> **Fix log (2026-03-30)** — 3 fields corrected against `edu-primesoft` CSV (24,749-row export):  
> `name` → `store=✅` (was ❌) · `state` → `readonly=❌` (was ✅, **critical**) · `display_in_project` → `store=✅ readonly=❌` (was ❌ ✅)

---

## 1. Field Reference Table

`store=True` = stored in PostgreSQL — safe to request in bulk `search_read`.  
`store=False` = computed on-the-fly — only fetch for a single task detail view, never in list calls.

### 1.1 Identity & Core

| Odoo Field | Label | Type | store | required | readonly | Notes |
|---|---|---|---|---|---|---|
| `id` | ID | integer | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Title | char | ✅ | ✅ | ❌ | Task title — required on create |
| `active` | Active | boolean | ✅ | ❌ | ❌ | False = archived/cancelled |
| `color` | Color Index | integer | ✅ | ❌ | ❌ | 0–11 color tag on Kanban card |
| `sequence` | Sequence | integer | ✅ | ❌ | ❌ | Order within stage column |
| `state` | State | selection | ✅ | ✅ | ❌ | Kanban status: `01_in_progress` · `1_done` · `1_canceled` · `04_waiting_normal` · `02_changes_requested` · `03_approved` |
| `priority` | Priority | selection | ✅ | ❌ | ❌ | `0` = Normal · `1` = Starred (star icon) |
| `description` | Description | html | ✅ | ❌ | ❌ | Rich text body (TipTap) |
| `is_template` | Is Template | boolean | ✅ | ❌ | ❌ | True = task template |
| `is_fsm` | Field Service | boolean | ✅ | ❌ | ❌ | True = Field Service module task |
| `display_in_project` | Display In Project | boolean | ✅ | ❌ | ❌ | False = personal task not shown in project Kanban — writable, safe to filter in `search_read` |
| `display_name` | Display Name | char | ❌ | ❌ | ❌ | Computed — use `name` instead |
| `create_date` | Created On | datetime | ✅ | ❌ | ✅ | System field |
| `write_date` | Last Updated On | datetime | ✅ | ❌ | ✅ | System field |

### 1.2 Project & Stage

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `project_id` | Project | many2one | `project.project` | ✅ | Null = personal task (My Tasks) |
| `stage_id` | Stage | many2one | `project.task.type` | ✅ | Kanban column — see `stage.md` |
| `personal_stage_type_ids` | Personal Stages | many2many | `project.task.type` | ✅ | Per-user personal stage overrides |
| `personal_stage_type_id` | Personal Stage | many2one | `project.task.type` | ❌ | Computed current user's personal stage |
| `personal_stage_id` | Personal Stage State | many2one | `project.task.stage.personal` | ❌ | Computed |
| `stage_id_color` | Stage Color | integer | ❌ | ❌ | Computed |
| `date_last_stage_update` | Last Stage Update | datetime | ✅ | ❌ | ✅ Read-only system field |

### 1.3 Assignees & People

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `user_ids` | Assignees | many2many | `res.users` | ✅ | Multiple assignees — use `(6, 0, [ids])` on write |
| `partner_id` | Customer | many2one | `res.partner` | ✅ | Contact linked to task |
| `partner_name` | Customer Name | char | ✅ | ❌ | Copied from partner |
| `partner_phone` | Contact Number | char | ✅ | ❌ | |
| `partner_company_name` | Company Name | char | ✅ | ❌ | |
| `partner_city` | City | char | ❌ | ❌ | |
| `partner_street` | Street | char | ❌ | ❌ | |
| `partner_street2` | Street2 | char | ❌ | ❌ | |
| `partner_zip` | ZIP | char | ❌ | ❌ | |
| `partner_country_id` | Country | many2one | `res.country` | ❌ | Computed |
| `partner_state_id` | Customer State | many2one | `res.country.state` | ❌ | Computed |
| `company_id` | Company | many2one | `res.company` | ✅ | Auto-set |
| `user_names` | User Names | char | ❌ | ❌ | Computed display string of assignees |
| `date_assign` | Assigning Date | datetime | ✅ | ❌ | ✅ Set automatically when first assignee added |
| `create_uid` | Created by | many2one | `res.users` | ✅ | ✅ Read-only |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | ✅ Read-only |

### 1.4 Dates & Timeline

| Odoo Field | Label | Type | store | required | Notes |
|---|---|---|---|---|---|
| `date_deadline` | Deadline | datetime | ✅ | ❌ | Task due date (shown on Kanban card) |
| `planned_date_begin` | Start date | datetime | ✅ | ❌ | Gantt start — also used by Calendar Auto Plan |
| `date_end` | Ending Date | datetime | ✅ | ❌ | Gantt end date |
| `planned_date_start` | Planned Date Start | datetime | ❌ | ❌ | Computed alias of `planned_date_begin` |

### 1.5 Hours & Time Tracking

| Odoo Field | Label | Type | store | required | readonly | Notes |
|---|---|---|---|---|---|---|
| `allocated_hours` | Allocated Time | float | ✅ | ❌ | ❌ | Planned hours — editable |
| `effective_hours` | Time Spent | float | ✅ | ❌ | ✅ | Sum of direct timesheets only (not subtasks) |
| `subtask_effective_hours` | Time Spent on Sub-tasks | float | ✅ | ❌ | ✅ | Sum of subtask timesheets |
| `total_hours_spent` | Total Time Spent | float | ✅ | ❌ | ✅ | `effective_hours + subtask_effective_hours` |
| `remaining_hours` | Time Remaining | float | ✅ | ❌ | ✅ | `allocated_hours - effective_hours` |
| `remaining_hours_so` | Time Remaining on SO | float | ❌ | ❌ | ✅ | Computed vs SO line |
| `remaining_hours_available` | Remaining Hours Available | boolean | ❌ | ❌ | ✅ | Computed |
| `remaining_hours_percentage` | Remaining Hours % | float | ❌ | ❌ | ✅ | Computed |
| `overtime` | Overtime | float | ✅ | ❌ | ✅ | Hours over allocated |
| `subtask_allocated_hours` | Sub-tasks Allocated Time | float | ❌ | ❌ | ✅ | Computed sum of subtask allocations |
| `progress` | Progress | float | ✅ | ❌ | ✅ | 0–100 — computed from timesheets |
| `encode_uom_in_days` | Encode in Days | boolean | ❌ | ❌ | ✅ | Computed from project setting |
| `timesheet_unit_amount` | Timesheet Unit Amount | float | ❌ | ❌ | ✅ | Computed |

### 1.6 Timer

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `timer_start` | Timer Start | datetime | ❌ | Set when timer starts — null when stopped |
| `timer_pause` | Timer Last Pause | datetime | ❌ | Set when timer paused |
| `is_timer_running` | Is Timer Running | boolean | ❌ | Computed for current user |
| `display_timesheet_timer` | Display Timesheet Timer | boolean | ❌ | Computed — show timer widget? |
| `user_timer_id` | User Timer | one2many → `timer.timer` | ❌ | Computed |

> **Timer API note**: Timer start/stop is NOT a simple field write. Call Odoo method `action_timer_start` / `action_timer_stop` on `project.task`. Example:
> ```python
> odoo_call("project.task", "action_timer_start", [[task_id]])
> odoo_call("project.task", "action_timer_stop", [[task_id]], {"description": "Work done"})
> ```

### 1.7 Subtasks

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `parent_id` | Parent Task | many2one | `project.task` | ✅ | Null = top-level task |
| `child_ids` | Sub-tasks | one2many | `project.task` | ✅ | Direct children only |
| `subtask_count` | Sub-task Count | integer | ❌ | Computed total (all levels) |
| `closed_subtask_count` | Closed Sub-tasks | integer | ❌ | Computed |
| `subtask_completion_percentage` | Subtask Completion % | float | ❌ | Computed |
| `has_template_ancestor` | Has Template Ancestor | boolean | ✅ | ✅ True if any parent is a template |
| `has_project_template` | Has Project Template | boolean | ❌ | Computed |

### 1.8 Task Dependencies (Blocked By / Blocks)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `depend_on_ids` | Blocked By | many2many | `project.task` | ✅ | Tasks that must complete first |
| `dependent_ids` | Block | many2many | `project.task` | ✅ | Tasks blocked by this task |
| `depend_on_count` | Depending on Tasks | integer | ❌ | Computed |
| `dependent_tasks_count` | Dependent Tasks | integer | ❌ | Computed |
| `closed_depend_on_count` | Closed Blocking Tasks | integer | ❌ | Computed |
| `dependency_warning` | Dependency Warning | html | ❌ | Computed warning when blockers exist |
| `display_warning_dependency_in_gantt` | Gantt Warning | boolean | ❌ | Computed |

> Enable with `allow_task_dependencies=True` on `project.project`.

### 1.9 Milestone

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `milestone_id` | Milestone | many2one | `project.milestone` | ✅ | Linked milestone |
| `has_late_and_unreached_milestone` | Late Unreached Milestone | boolean | ❌ | Computed warning |

### 1.10 Recurring Tasks

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `recurring_task` | Recurrent | boolean | ✅ | True = this is a recurring task |
| `recurrence_id` | Recurrence | many2one → `project.task.recurrence` | ✅ | Recurrence config record |
| `recurring_count` | Tasks in Recurrence | integer | ❌ | Computed |
| `repeat_interval` | Repeat Every | integer | ❌ | N (every N units) — written via recurrence_id |
| `repeat_unit` | Repeat Unit | selection | ❌ | `day` · `week` · `month` · `year` |
| `repeat_type` | Until | selection | ❌ | `forever` · `until` |
| `repeat_until` | End Date | date | ❌ | End date if `repeat_type=until` |

> **Recurrence write note**: To set recurrence, write to `recurrence_id` fields or call `action_set_recurrence`. Do not write `repeat_*` fields directly on `project.task` — they are relational proxies.

### 1.11 Tags

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `tag_ids` | Tags | many2many | `project.tags` | ✅ | Color-coded tags — use `(6, 0, [ids])` on write |
| `role_ids` | Project Roles | many2many | `project.role` | ✅ | For resource planning |

### 1.12 Timesheets

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `timesheet_ids` | Timesheets | one2many | `account.analytic.line` | ✅ | All timesheet lines for this task |
| `allow_timesheets` | Allow Timesheets | boolean | ❌ | Computed from `project_id.allow_timesheets` |
| `timesheet_product_id` | Timesheet Product | many2one | `product.product` | ❌ | Computed from project |

### 1.13 Sales & Billing

| Odoo Field | Label | Type | Relation | store | readonly | Notes |
|---|---|---|---|---|---|---|
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | ✅ | ❌ | Links task to a specific SO line |
| `sale_order_id` | Sales Order | many2one | `sale.order` | ✅ | ✅ | Computed from `sale_line_id` |
| `sale_order_state` | Status | selection | ❌ | ✅ | Computed SO state |
| `project_sale_order_id` | Project's Sale Order | many2one | `sale.order` | ❌ | ✅ | Computed |
| `last_sol_of_customer` | Last Sol Of Customer | many2one | `sale.order.line` | ❌ | ✅ | Computed |
| `pricing_type` | Pricing | selection | ❌ | ✅ | Computed from project |
| `allow_billable` | Billable | boolean | ❌ | ✅ | Computed from project |
| `task_to_invoice` | To Invoice | boolean | ❌ | ✅ | Computed |
| `invoice_count` | Number of Invoices | integer | ❌ | ✅ | Smart button count |
| `invoice_status` | Invoice Status | selection | ❌ | ✅ | `invoiced` · `to_invoice` · `no` |
| `quotation_count` | Quotation Count | integer | ❌ | ✅ | Smart button count |
| `pricelist_id` | Pricelist | many2one | `product.pricelist` | ❌ | ✅ | |
| `has_multi_sol` | Has Multi SOL | boolean | ❌ | ✅ | Multiple SO lines? |
| `material_line_product_count` | Material Product Count | integer | ❌ | ✅ | Products tab count |
| `material_line_total_price` | Material Total Price | float | ❌ | ✅ | |

### 1.14 Customer Ratings

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `rating_ids` | Ratings | one2many → `rating.rating` | ✅ | All rating records |
| `rating_last_value` | Rating Last Value | float | ✅ | `1`=Bad · `5`=OK · `10`=Good |
| `rating_last_text` | Rating Text | selection | ❌ | `great` · `okay` · `bad` |
| `rating_last_feedback` | Rating Last Feedback | text | ❌ | Customer's comment |
| `rating_last_image` | Rating Last Image | binary | ❌ | Smiley face image |
| `rating_count` | Rating Count | integer | ❌ | |
| `rating_avg` | Average Rating | float | ❌ | |
| `rating_avg_text` | Rating Avg Text | selection | ❌ | |
| `rating_percentage_satisfaction` | Rating Satisfaction | float | ❌ | |
| `rating_active` | Stage Rating Status | boolean | ❌ | Computed from stage |

> `rating_last_value` drives the task state automatically:  
> `10` → state `03_approved` (Approved) · `5` → state `02_changes_requested` · `1` → state `04_waiting_normal`

### 1.15 Email & Portal

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `email_from` | Email From | char | ✅ | Sender email (if created via alias) |
| `email_cc` | Email CC | char | ✅ | CC addresses |
| `access_token` | Security Token | char | ✅ | Portal share token — never expose in list API |
| `access_url` | Portal Access URL | char | ❌ | Computed — use when sharing portal link |
| `portal_user_names` | Portal User Names | char | ❌ | Computed |
| `portal_effective_hours` | Portal Effective Hours | float | ❌ | Shown to portal users |
| `portal_remaining_hours` | Portal Remaining Hours | float | ❌ | |
| `portal_progress` | Portal Progress | float | ❌ | |
| `portal_total_hours_spent` | Portal Total Hours Spent | float | ❌ | |
| `portal_subtask_effective_hours` | Portal Subtask Hours | float | ❌ | |
| `portal_invoice_count` | Portal Invoice Count | integer | ❌ | |
| `portal_quotation_count` | Portal Quotation Count | integer | ❌ | |
| `show_customer_preview` | Show Customer Preview | boolean | ❌ | |
| `current_user_same_company_partner` | Same Company Partner | boolean | ❌ | |

### 1.16 Attachments & Cover Image

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `displayed_image_id` | Cover Image | many2one | `ir.attachment` | ✅ | Card cover photo (Kanban) |
| `attachment_ids` | Attachments | one2many | `ir.attachment` | ❌ | All attachments |
| `message_attachment_count` | Attachment Count | integer | ❌ | Computed |
| `link_preview_name` | Link Preview Name | char | ❌ | |

### 1.17 Activities (Chatter)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `activity_ids` | Activities | one2many | `mail.activity` | ✅ | Scheduled activities |
| `activity_state` | Activity State | selection | ❌ | `overdue` · `today` · `planned` |
| `activity_date_deadline` | Next Activity Deadline | date | ❌ | |
| `activity_summary` | Next Activity Summary | char | ❌ | |
| `activity_type_id` | Next Activity Type | many2one | `mail.activity.type` | ❌ | |
| `activity_user_id` | Responsible User | many2one | `res.users` | ❌ | |
| `activity_calendar_event_id` | Calendar Event | many2one | `calendar.event` | ❌ | |
| `activity_exception_decoration` | Exception Decoration | selection | ❌ | |
| `my_activity_date_deadline` | My Activity Deadline | date | ❌ | Current user |

### 1.18 Messages & Followers (Chatter)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `message_ids` | Messages | one2many | `mail.message` | ✅ | Chatter log |
| `message_follower_ids` | Followers | one2many | `mail.followers` | ✅ | |
| `message_partner_ids` | Followers (Partners) | many2many | `res.partner` | ❌ | |
| `message_is_follower` | Is Follower | boolean | ❌ | Current user? |
| `message_needaction` | Action Needed | boolean | ❌ | Unread? |
| `message_needaction_counter` | # Actions | integer | ❌ | |
| `message_has_error` | Delivery Error | boolean | ❌ | |
| `message_has_sms_error` | SMS Error | boolean | ❌ | |
| `has_message` | Has Message | boolean | ❌ | |
| `website_message_ids` | Website Messages | one2many | `mail.message` | ✅ | |

### 1.19 Time Off / HR

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `is_absent` | Employees on Time Off | boolean | ❌ | True if assignee is on leave |
| `leave_warning` | Leave Warning | char | ❌ | Warning message |
| `leave_types_count` | Time Off Types Count | integer | ❌ | |
| `is_timeoff_task` | Is Time Off Task | boolean | ❌ | Auto-created by Time Off module |
| `planning_overlap` | Planning Overlap | html | ❌ | Planning schedule conflict |
| `is_project_map_empty` | Is Project Map Empty | boolean | ❌ | |
| `user_skill_ids` | Skills | one2many → `hr.employee.skill` | ❌ | |
| `working_days_close` | Working Days to Close | float | ✅ | ✅ |
| `working_days_open` | Working Days to Assign | float | ✅ | ✅ |
| `working_hours_close` | Working Hours to Close | float | ✅ | ✅ |
| `working_hours_open` | Working Hours to Assign | float | ✅ | ✅ |

### 1.20 Helpdesk & FSM

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `helpdesk_ticket_id` | Original Ticket | many2one | `helpdesk.ticket` | ✅ | ✅ If task was created from helpdesk |
| `fsm_done` | Task Done | boolean | ✅ | Field Service completion |
| `fsm_is_sent` | FSM Is Sent | boolean | ✅ | ✅ |
| `worksheet_template_id` | Worksheet Template | many2one | `worksheet.template` | ✅ | FSM worksheet |
| `worksheet_count` | Worksheet Count | integer | ❌ | |
| `worksheet_signature` | Signature | binary | ✅ | |
| `worksheet_signed_by` | Signed By | char | ✅ | |
| `under_warranty` | Under Warranty | boolean | ✅ | |
| `stock_move_customer_product_count` | Stock Move Count | integer | ❌ | |
| `is_task_phone_update` | Is Task Phone Update | boolean | ❌ | |

### 1.21 Display / UI Flags (all computed, store=False)

These control button visibility in the Odoo UI — you can ignore them in your React build (React controls its own button display logic).

| Odoo Field | Label |
|---|---|
| `display_create_invoice_primary` | Show Create Invoice button (primary) |
| `display_create_invoice_secondary` | Show Create Invoice button (secondary) |
| `display_mark_as_done_primary` | Show Mark As Done (primary) |
| `display_mark_as_done_secondary` | Show Mark As Done (secondary) |
| `display_send_report_primary` | Show Send Report (primary) |
| `display_send_report_secondary` | Show Send Report (secondary) |
| `display_sign_report_primary` | Show Sign Report (primary) |
| `display_sign_report_secondary` | Show Sign Report (secondary) |
| `display_parent_task_button` | Show Parent Task smart button |
| `display_sale_order_button` | Show Sales Order smart button |
| `display_follow_button` | Show Follow button |
| `display_helpdesk_ticket_button` | Show Helpdesk Ticket button |
| `display_enabled_conditions_count` | Count of enabled conditions |
| `display_satisfied_conditions_count` | Count of satisfied conditions |

### 1.22 Misc

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `html_field_history` | History data | json | ✅ | Rich text edit history |
| `html_field_history_metadata` | History metadata | json | ❌ | |
| `task_properties` | Properties | properties | ✅ | Custom task properties (from project schema) |
| `duration_tracking` | Status time | json | ❌ | Time spent per state |
| `is_closed` | Closed State | boolean | ❌ | Computed — True when state is done/cancelled |
| `is_rotting` | Rotting | boolean | ❌ | No activity for N days |
| `rotting_days` | Days Rotting | integer | ❌ | |
| `warning_message` | Warning Message | char | ❌ | |
| `analytic_account_active` | Active Analytic Account | boolean | ❌ | |
| `currency_id` | Currency | many2one | ❌ | Computed |
| `project_privacy_visibility` | Project Visibility | selection | ❌ | Computed from project |
| `allow_*` fields | Feature toggles | boolean | ❌ | All computed from `project_id` |

---

## 2. Field Sets for Odoo API Calls

### 2.1 `TASK_KANBAN_FIELDS` — Kanban card (fast, stored only)

```python
# apps/tasks/constants.py

TASK_KANBAN_FIELDS = [
    "id",
    "name",
    "active",
    "color",
    "sequence",
    "state",                    # Kanban status dot
    "priority",                 # Star
    "project_id",
    "stage_id",
    "user_ids",                 # Assignee avatars
    "partner_id",
    "date_deadline",
    "planned_date_begin",
    "allocated_hours",
    "effective_hours",          # store=True — safe in list
    "total_hours_spent",        # store=True
    "remaining_hours",          # store=True
    "overtime",                 # store=True
    "tag_ids",
    "milestone_id",
    "parent_id",                # Is this a subtask?
    "child_ids",                # Has subtasks?
    "depend_on_ids",            # Blocked By
    "recurring_task",
    "recurrence_id",
    "displayed_image_id",       # Cover image
    "rating_last_value",        # store=True
    "personal_stage_type_ids",
    "is_closed",                # store=False but lightweight
    "is_rotting",
    "activity_ids",             # For activity icon on card
    "activity_state",
]
```

### 2.2 `TASK_DETAIL_FIELDS` — Full task form (single task fetch)

```python
TASK_DETAIL_FIELDS = TASK_KANBAN_FIELDS + [
    "description",
    "email_from",
    "email_cc",
    "date_end",
    "date_assign",
    "date_last_stage_update",
    "subtask_count",
    "closed_subtask_count",
    "subtask_completion_percentage",
    "subtask_allocated_hours",
    "subtask_effective_hours",
    "dependent_ids",
    "depend_on_count",
    "dependent_tasks_count",
    "closed_depend_on_count",
    "dependency_warning",
    "sale_line_id",
    "sale_order_id",
    "invoice_count",
    "invoice_status",
    "task_to_invoice",
    "quotation_count",
    "timesheet_ids",
    "activity_date_deadline",
    "activity_summary",
    "activity_type_id",
    "activity_user_id",
    "message_follower_ids",
    "message_ids",
    "message_is_follower",
    "message_needaction",
    "message_attachment_count",
    "rating_ids",
    "rating_last_feedback",
    "rating_last_text",
    "access_token",
    "task_properties",
    "helpdesk_ticket_id",
    "html_field_history",
    "company_id",
    "create_uid",
    "write_uid",
    "write_date",
    "create_date",
]
```

### 2.3 `TASK_GANTT_FIELDS` — Gantt view only

```python
TASK_GANTT_FIELDS = [
    "id",
    "name",
    "project_id",
    "stage_id",
    "user_ids",
    "planned_date_begin",
    "date_end",
    "date_deadline",
    "allocated_hours",
    "depend_on_ids",            # Arrow lines
    "dependent_ids",
    "milestone_id",
    "state",
    "color",
    "is_closed",
    "active",
]
```

### 2.4 `TASK_CALENDAR_FIELDS` — Calendar view only

```python
TASK_CALENDAR_FIELDS = [
    "id",
    "name",
    "project_id",
    "user_ids",
    "date_deadline",
    "planned_date_begin",
    "date_end",
    "state",
    "color",
    "is_closed",
]
```

---

## 3. `state` Field — The Kanban Status Dot

This is the most important field for UX. It is **separate from `stage_id`** (the column). A task can be in stage "In Progress" but have state "Off Track".

| Odoo value | Label | Color | Icon |
|---|---|---|---|
| `01_in_progress` | In Progress | ⚪ Grey | Default — no dot |
| `1_done` | Done | 🟢 Green | Checkmark |
| `1_canceled` | Cancelled | ⚫ Dark | X |
| `04_waiting_normal` | On Hold / Waiting | 🟡 Yellow | Pause |
| `02_changes_requested` | Changes Requested | 🟠 Orange | Refresh |
| `03_approved` | Approved | 🟢 Green | Thumbs up |

```javascript
// src/utils/taskStatus.js
export const TASK_STATE_MAP = {
  "01_in_progress":      { label: "In Progress",         color: "#94a3b8", dot: null },
  "1_done":              { label: "Done",                 color: "#22c55e", dot: "✓" },
  "1_canceled":          { label: "Cancelled",            color: "#374151", dot: "✕" },
  "04_waiting_normal":   { label: "On Hold",              color: "#eab308", dot: "⏸" },
  "02_changes_requested":{ label: "Changes Requested",    color: "#f97316", dot: "↺" },
  "03_approved":         { label: "Approved",             color: "#16a34a", dot: "👍" },
};

export const getTaskStateStyle = (state) =>
  TASK_STATE_MAP[state] ?? TASK_STATE_MAP["01_in_progress"];
```

---

## 4. Django DRF Implementation

### 4.1 Serializer

```python
# apps/tasks/serializers.py
from rest_framework import serializers

STATE_CHOICES = [
    "01_in_progress", "1_done", "1_canceled",
    "04_waiting_normal", "02_changes_requested", "03_approved",
]

class TaskSerializer(serializers.Serializer):
    # Identity
    name                    = serializers.CharField(max_length=255)
    active                  = serializers.BooleanField(default=True)
    color                   = serializers.IntegerField(min_value=0, max_value=11, default=0)
    sequence                = serializers.IntegerField(default=10)
    state                   = serializers.ChoiceField(choices=STATE_CHOICES, default="01_in_progress")
    priority                = serializers.ChoiceField(choices=["0", "1"], default="0")
    description             = serializers.CharField(required=False, allow_blank=True)
    is_template             = serializers.BooleanField(default=False)

    # Project & Stage
    project_id              = serializers.IntegerField(required=False, allow_null=True)
    stage_id                = serializers.IntegerField(required=False, allow_null=True)
    personal_stage_type_ids = serializers.ListField(child=serializers.IntegerField(), required=False)

    # Dates
    date_deadline           = serializers.DateTimeField(required=False, allow_null=True)
    planned_date_begin      = serializers.DateTimeField(required=False, allow_null=True)
    date_end                = serializers.DateTimeField(required=False, allow_null=True)

    # People
    user_ids                = serializers.ListField(child=serializers.IntegerField(), required=False)
    partner_id              = serializers.IntegerField(required=False, allow_null=True)
    partner_name            = serializers.CharField(required=False, allow_blank=True)
    partner_phone           = serializers.CharField(required=False, allow_blank=True)

    # Hours
    allocated_hours         = serializers.FloatField(default=0.0)

    # Tags & Relations
    tag_ids                 = serializers.ListField(child=serializers.IntegerField(), required=False)
    role_ids                = serializers.ListField(child=serializers.IntegerField(), required=False)

    # Hierarchy
    parent_id               = serializers.IntegerField(required=False, allow_null=True)
    milestone_id            = serializers.IntegerField(required=False, allow_null=True)

    # Dependencies
    depend_on_ids           = serializers.ListField(child=serializers.IntegerField(), required=False)
    dependent_ids           = serializers.ListField(child=serializers.IntegerField(), required=False)

    # Billing
    sale_line_id            = serializers.IntegerField(required=False, allow_null=True)

    # Recurrence
    recurring_task          = serializers.BooleanField(default=False)

    # Cover image
    displayed_image_id      = serializers.IntegerField(required=False, allow_null=True)

    # Email (alias-created tasks)
    email_from              = serializers.EmailField(required=False, allow_blank=True)
    email_cc                = serializers.CharField(required=False, allow_blank=True)

    def to_odoo(self, validated_data: dict) -> dict:
        """Convert to Odoo-compatible format. Handles many2many command tuples."""
        payload = dict(validated_data)

        # many2many → Odoo command 6 (replace all)
        for m2m_field in ("user_ids", "tag_ids", "role_ids",
                          "depend_on_ids", "dependent_ids",
                          "personal_stage_type_ids"):
            if m2m_field in payload:
                ids = payload[m2m_field]
                payload[m2m_field] = [(6, 0, ids)]

        return payload
```

### 4.2 ViewSet

```python
# apps/tasks/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import TaskSerializer
from .constants import TASK_KANBAN_FIELDS, TASK_DETAIL_FIELDS, TASK_GANTT_FIELDS, TASK_CALENDAR_FIELDS


class TaskViewSet(ViewSet):

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/tasks/
        Query params:
          ?project_id=<id>          filter by project (almost always required)
          ?stage_id=<id>            filter by Kanban column
          ?user_id=<id>             filter by assignee
          ?milestone_id=<id>        filter by milestone
          ?parent_id=<id>           subtasks of a task
          ?parent_id=false          top-level tasks only
          ?active=true|false|all    default: true
          ?view=kanban|gantt|calendar  selects field set
          ?order=sequence asc       default ordering
        """
        domain = []
        params = request.query_params

        if params.get("project_id"):
            domain.append(["project_id", "=", int(params["project_id"])])

        if params.get("stage_id"):
            domain.append(["stage_id", "=", int(params["stage_id"])])

        if params.get("user_id"):
            domain.append(["user_ids", "in", [int(params["user_id"])]])

        if params.get("milestone_id"):
            domain.append(["milestone_id", "=", int(params["milestone_id"])])

        if params.get("parent_id") == "false":
            domain.append(["parent_id", "=", False])
        elif params.get("parent_id"):
            domain.append(["parent_id", "=", int(params["parent_id"])])

        active_param = params.get("active", "true")
        if active_param == "true":
            domain.append(["active", "=", True])
        elif active_param == "false":
            domain.append(["active", "=", False])

        view = params.get("view", "kanban")
        fields_map = {
            "kanban":   TASK_KANBAN_FIELDS,
            "gantt":    TASK_GANTT_FIELDS,
            "calendar": TASK_CALENDAR_FIELDS,
        }
        fields = fields_map.get(view, TASK_KANBAN_FIELDS)
        order = params.get("order", "sequence asc")

        tasks = odoo_call(
            "project.task", "search_read",
            [domain],
            {"fields": fields, "order": order}
        )
        return Response(tasks)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/tasks/{id}/"""
        result = odoo_call(
            "project.task", "read",
            [[int(pk)]],
            {"fields": TASK_DETAIL_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """POST /api/tasks/"""
        serializer = TaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        new_id = odoo_call("project.task", "create", [payload])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """PATCH /api/tasks/{id}/"""
        serializer = TaskSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        odoo_call("project.task", "write", [[int(pk)], payload])
        return Response({"id": int(pk)})

    # ── Delete (Archive) ──────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/tasks/{id}/
        Archive (active=False) instead of unlink — preserves timesheet history.
        """
        odoo_call("project.task", "write", [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Custom Actions ────────────────────────────────────────────

    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        """
        PATCH /api/tasks/{id}/move/
        Body: { "stage_id": <id> }
        Kanban drag-drop. Only updates stage_id — preserves sequence within column.
        """
        stage_id = request.data.get("stage_id")
        if not stage_id:
            return Response({"detail": "stage_id required"}, status=400)
        odoo_call("project.task", "write",
                  [[int(pk)], {"stage_id": int(stage_id)}])
        return Response({"id": int(pk), "stage_id": int(stage_id)})

    @action(detail=True, methods=["patch"], url_path="reorder")
    def reorder(self, request, pk=None):
        """
        PATCH /api/tasks/{id}/reorder/
        Body: { "stage_id": <id>, "sequence": <int> }
        Drag-drop within same column — updates both stage and sequence.
        """
        payload = {}
        if "stage_id" in request.data:
            payload["stage_id"] = int(request.data["stage_id"])
        if "sequence" in request.data:
            payload["sequence"] = int(request.data["sequence"])
        odoo_call("project.task", "write", [[int(pk)], payload])
        return Response({"id": int(pk), **payload})

    @action(detail=True, methods=["patch"], url_path="state")
    def set_state(self, request, pk=None):
        """
        PATCH /api/tasks/{id}/state/
        Body: { "state": "01_in_progress" }
        Updates the Kanban status dot independently of the column.
        """
        valid = {"01_in_progress", "1_done", "1_canceled",
                 "04_waiting_normal", "02_changes_requested", "03_approved"}
        new_state = request.data.get("state")
        if new_state not in valid:
            return Response({"detail": f"state must be one of {valid}"}, status=400)
        odoo_call("project.task", "write",
                  [[int(pk)], {"state": new_state}])
        return Response({"id": int(pk), "state": new_state})

    @action(detail=True, methods=["post"], url_path="timer/start")
    def timer_start(self, request, pk=None):
        """POST /api/tasks/{id}/timer/start/"""
        odoo_call("project.task", "action_timer_start", [[int(pk)]])
        return Response({"id": int(pk), "is_timer_running": True})

    @action(detail=True, methods=["post"], url_path="timer/stop")
    def timer_stop(self, request, pk=None):
        """
        POST /api/tasks/{id}/timer/stop/
        Body: { "description": "Work done" }  (optional)
        Stops timer and creates a timesheet line automatically.
        """
        description = request.data.get("description", "/")
        odoo_call("project.task", "action_timer_stop",
                  [[int(pk)]], {"description": description})
        return Response({"id": int(pk), "is_timer_running": False})

    @action(detail=True, methods=["get"], url_path="subtasks")
    def subtasks(self, request, pk=None):
        """GET /api/tasks/{id}/subtasks/ — direct children only"""
        tasks = odoo_call(
            "project.task", "search_read",
            [[["parent_id", "=", int(pk)], ["active", "=", True]]],
            {"fields": TASK_KANBAN_FIELDS, "order": "sequence asc"}
        )
        return Response(tasks)

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        """POST /api/tasks/{id}/duplicate/"""
        defaults = {}
        if request.data.get("name"):
            defaults["name"] = request.data["name"]
        new_id = odoo_call("project.task", "copy", [[int(pk)], defaults])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"], url_path="my-tasks")
    def my_tasks(self, request):
        """
        GET /api/tasks/my-tasks/
        Tasks assigned to the current user across all projects.
        Query: ?state=open|all (default: open = not done/cancelled)
        """
        # Get current user id from Odoo session
        # In production: store uid in Django session after auth
        uid = request.session.get("odoo_uid")
        domain = [["user_ids", "in", [uid]]]

        state_filter = request.query_params.get("state", "open")
        if state_filter == "open":
            domain.append(["state", "not in", ["1_done", "1_canceled"]])

        tasks = odoo_call(
            "project.task", "search_read",
            [domain],
            {"fields": TASK_KANBAN_FIELDS, "order": "date_deadline asc"}
        )
        return Response(tasks)
```

### 4.3 URL Configuration

```python
# apps/tasks/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet

router = DefaultRouter()
router.register(r"tasks", TaskViewSet, basename="task")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/tasks/?project_id={id}&view=kanban
# POST   /api/tasks/
# GET    /api/tasks/{id}/
# PATCH  /api/tasks/{id}/
# DELETE /api/tasks/{id}/
# PATCH  /api/tasks/{id}/move/
# PATCH  /api/tasks/{id}/reorder/
# PATCH  /api/tasks/{id}/state/
# POST   /api/tasks/{id}/timer/start/
# POST   /api/tasks/{id}/timer/stop/
# GET    /api/tasks/{id}/subtasks/
# POST   /api/tasks/{id}/duplicate/
# GET    /api/tasks/my-tasks/
```

---

## 5. React API Layer

```javascript
// src/api/tasks.js
import client from "./client";

// ── List ──────────────────────────────────────────────────────────
export const getTasks = (params = {}) =>
  client.get("/tasks/", { params }).then((r) => r.data);
// params: { project_id, stage_id, user_id, parent_id, active, view, order }

// ── My Tasks ──────────────────────────────────────────────────────
export const getMyTasks = (state = "open") =>
  client.get("/tasks/my-tasks/", { params: { state } }).then((r) => r.data);

// ── Detail ────────────────────────────────────────────────────────
export const getTask = (id) =>
  client.get(`/tasks/${id}/`).then((r) => r.data);

// ── Create ────────────────────────────────────────────────────────
export const createTask = (data) =>
  client.post("/tasks/", data).then((r) => r.data);

// ── Update ────────────────────────────────────────────────────────
export const updateTask = (id, data) =>
  client.patch(`/tasks/${id}/`, data).then((r) => r.data);

// ── Kanban drag-drop ──────────────────────────────────────────────
export const moveTask = (id, stageId) =>
  client.patch(`/tasks/${id}/move/`, { stage_id: stageId }).then((r) => r.data);

export const reorderTask = (id, stageId, sequence) =>
  client.patch(`/tasks/${id}/reorder/`, { stage_id: stageId, sequence }).then((r) => r.data);

// ── Status dot ────────────────────────────────────────────────────
export const setTaskState = (id, state) =>
  client.patch(`/tasks/${id}/state/`, { state }).then((r) => r.data);

// ── Timer ─────────────────────────────────────────────────────────
export const startTimer = (id) =>
  client.post(`/tasks/${id}/timer/start/`).then((r) => r.data);

export const stopTimer = (id, description = "") =>
  client.post(`/tasks/${id}/timer/stop/`, { description }).then((r) => r.data);

// ── Subtasks ──────────────────────────────────────────────────────
export const getSubtasks = (id) =>
  client.get(`/tasks/${id}/subtasks/`).then((r) => r.data);

// ── Archive / Duplicate ───────────────────────────────────────────
export const archiveTask = (id) =>
  client.delete(`/tasks/${id}/`).then((r) => r.data);

export const duplicateTask = (id, name = null) =>
  client.post(`/tasks/${id}/duplicate/`, name ? { name } : {}).then((r) => r.data);
```

---

## 6. React Query Hooks

```javascript
// src/hooks/useTasks.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/tasks";

// ── List (Kanban) ─────────────────────────────────────────────────
export const useTasks = (params = {}) =>
  useQuery({
    queryKey: ["tasks", params],
    queryFn: () => api.getTasks(params),
    enabled: !!params.project_id,
    staleTime: 30_000,
  });

// ── Detail ────────────────────────────────────────────────────────
export const useTask = (id) =>
  useQuery({
    queryKey: ["tasks", id],
    queryFn: () => api.getTask(id),
    enabled: !!id,
  });

// ── Kanban drag-drop (optimistic) ─────────────────────────────────
export const useMoveTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stageId }) => api.moveTask(id, stageId),
    onMutate: async ({ id, stageId }) => {
      // Cancel in-flight queries to avoid race conditions
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snapshot = qc.getQueriesData({ queryKey: ["tasks"] });

      // Optimistically update the card's stage in every cached query
      qc.setQueriesData({ queryKey: ["tasks"] }, (old) =>
        Array.isArray(old)
          ? old.map((t) => (t.id === id ? { ...t, stage_id: [stageId, ""] } : t))
          : old
      );
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      // Roll back all affected queries
      ctx.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
};

// ── State dot (optimistic) ────────────────────────────────────────
export const useSetTaskState = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, state }) => api.setTaskState(id, state),
    onMutate: async ({ id, state }) => {
      await qc.cancelQueries({ queryKey: ["tasks", { project_id: projectId }] });
      const prev = qc.getQueryData(["tasks", { project_id: projectId }]);
      qc.setQueryData(["tasks", { project_id: projectId }], (old) =>
        old?.map((t) => (t.id === id ? { ...t, state } : t))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["tasks", { project_id: projectId }], ctx.prev);
    },
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["tasks", { project_id: projectId }] }),
  });
};

// ── Timer ─────────────────────────────────────────────────────────
export const useTimer = (taskId) => {
  const qc = useQueryClient();
  const start = useMutation({
    mutationFn: () => api.startTimer(taskId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", taskId] }),
  });
  const stop = useMutation({
    mutationFn: (description) => api.stopTimer(taskId, description),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      qc.invalidateQueries({ queryKey: ["timesheets"] }); // new line created
    },
  });
  return { start, stop };
};

// ── Create ────────────────────────────────────────────────────────
export const useCreateTask = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", { project_id: projectId }] }),
  });
};

// ── Update ────────────────────────────────────────────────────────
export const useUpdateTask = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.updateTask(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", id] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
};
```

---

## 7. Domain Filter Reference

```python
# All active tasks in a project
[["project_id", "=", project_id], ["active", "=", True]]

# Tasks in a specific stage
[["stage_id", "=", stage_id]]

# Open tasks (not done or cancelled)
[["state", "not in", ["1_done", "1_canceled"]], ["active", "=", True]]

# Tasks assigned to a specific user
[["user_ids", "in", [user_id]]]

# Top-level tasks only (no subtasks)
[["parent_id", "=", False]]

# Subtasks of a specific task
[["parent_id", "=", parent_task_id]]

# Tasks linked to a milestone
[["milestone_id", "=", milestone_id]]

# Starred tasks only
[["priority", "=", "1"]]

# Overdue tasks (deadline passed, not done)
[
    ["date_deadline", "<", fields.Date.today()],
    ["state", "not in", ["1_done", "1_canceled"]],
    ["active", "=", True],
]

# Recurring tasks
[["recurring_task", "=", True]]

# Tasks blocked by others (have blockers)
[["depend_on_ids", "!=", False]]

# Tasks with unlogged time (allocated but nothing logged)
[["allocated_hours", ">", 0], ["effective_hours", "=", 0]]

# Personal tasks (no project)
[["project_id", "=", False], ["user_ids", "in", [uid]]]
```

---

## 8. Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| `state` vs `stage_id` | These are completely different. `stage_id` = Kanban column. `state` = status dot. Never confuse them. | Keep both in your task card — `stage_id` determines column, `state` determines the dot color |
| `name` is required AND stored | `store=True` and `required=True` in CSV. Odoo raises a `ValidationError` if you omit it. Safe to request in bulk `search_read`. | Always validate `name` in the serializer; always include it in `TASK_KANBAN_FIELDS` |
| Timer methods are not field writes | `action_timer_start` / `action_timer_stop` are Odoo Python methods, not field assignments | Call them via `odoo_call("project.task", "action_timer_start", [[id]])` — not via `write` |
| `user_ids` is many2many | Even with one assignee, must use `(6, 0, [id])` command | The serializer's `to_odoo()` handles this |
| `depend_on_ids` / `dependent_ids` | Both are many2many on `project.task` → tasks can only have dependencies if `project.allow_task_dependencies=True` | Check project setting before showing Blocked By UI |
| Archive vs delete | `unlink` on a task with timesheets will fail or leave orphan analytic lines | Always `write({"active": False})` to archive |
| `effective_hours` is store=True but computed | It's safe in list calls (no N+1) but only updates when timesheets are written — not real-time | After timer stop, invalidate both tasks and timesheets queries |
| `state` `1_done` vs `1_canceled` | Both are "closed" states. `is_closed` is a computed field that covers both. For "Mark as Done" use `1_done`, for "Cancel" use `1_canceled` | Use `is_closed` for display logic, `state` for the exact value |
| `personal_stage_type_ids` many2many | This is per-user. When writing, only set the current user's personal stage — don't overwrite others | Use `(4, id)` Odoo command to add without replacing: `[(4, stage_id)]` |
| Rating updates state automatically | When Odoo processes a customer rating, it writes `rating_last_value` AND updates `state` | After a rating webhook, invalidate the full task to get both updated values |
