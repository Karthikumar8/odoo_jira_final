# Database – Antigravity (Odoo Project Replica)

**Source**: `edu-primesoft` Odoo cloud — 24,749 fields extracted 2026-03-26.  
**Rule**: Antigravity has **no local database**. Django is a proxy only.  
Every table below is an Odoo model. Every field name is the exact XML-RPC field name.

---

## How to read this document

Each section covers one Odoo model and has four parts:

1. **Field table** — every stored field from your CSV (`stored=True`), its type, relation, and whether it is required in Odoo.
2. **`search_read` field list** — the exact Python list to pass to `odoo_call()`. Only request what you render — never request `*`.
3. **DRF Serializer** — the `serializers.py` class for that model.
4. **Common domain filters** — the Odoo domain expressions your views will use most.

---

## Model Index

| # | Odoo Model | Django name | Rows in CSV |
|---|---|---|---|
| 1 | `project.project` | `Project` | 150 |
| 2 | `project.task.type` | `Stage` | 23 |
| 3 | `project.task` | `Task` | 206 |
| 4 | `project.task.recurrence` | `Recurrence` | 11 |
| 5 | `project.milestone` | `Milestone` | 39 |
| 6 | `project.update` | `ProjectUpdate` | 50 |
| 7 | `account.analytic.line` | `Timesheet` | 35+ |
| 8 | `project.project.stage` | `ProjectStage` | 14 |
| 9 | `project.tags` | `Tag` | 10 |
| 10 | `project.collaborator` | `Collaborator` | 8 |
| 11 | `project.task.stage.personal` | `PersonalStage` | 9 |
| 12 | `mail.activity` | `Activity` | 20+ |

---

## 1. `project.project` → `Project`

### 1.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Name | char | — | ✅ | ✅ |
| `active` | Active | boolean | — | — | — |
| `color` | Color Index | integer | — | — | — |
| `partner_id` | Customer | many2one | `res.partner` | — | ✅ |
| `user_id` | Project Manager | many2one | `res.users` | — | — |
| `date_start` | Start Date | date | — | — | — |
| `date` | Expiration Date | date | — | — | ✅ |
| `description` | Description | html | — | — | — |
| `privacy_visibility` | Visibility | selection | — | ✅ | — |
| `allow_timesheets` | Timesheets | boolean | — | — | — |
| `allow_milestones` | Milestones | boolean | — | — | — |
| `allow_recurring_tasks` | Recurring Tasks | boolean | — | — | — |
| `allow_task_dependencies` | Task Dependencies | boolean | — | — | — |
| `allow_billable` | Billable | boolean | — | — | — |
| `billing_type` | Billing Type | selection | — | ✅ | — |
| `allocated_hours` | Allocated Time | float | — | — | — |
| `account_id` | Project Account | many2one | `account.analytic.account` | — | ✅ |
| `alias_id` | Alias | many2one | `mail.alias` | ✅ | — |
| `alias_name` | Alias Name | char | — | — | — |
| `last_update_status` | Last Update Status | selection | — | ✅ | — |
| `last_update_id` | Last Update | many2one | `project.update` | — | — |
| `stage_id` | Stage | many2one | `project.project.stage` | — | ✅ |
| `is_template` | Is Template | boolean | — | — | — |
| `is_favorite` | Show on Dashboard | boolean | — | — | — |
| `tag_ids` | Tags | many2many | `project.tags` | — | — |
| `favorite_user_ids` | Members | many2many | `res.users` | — | — |
| `milestone_ids` | Milestones | one2many | `project.milestone` | — | — |
| `collaborator_ids` | Collaborators | one2many | `project.collaborator` | — | — |
| `allow_quotations` | Extra Quotations | boolean | — | — | — |
| `allow_material` | Products on Tasks | boolean | — | — | — |
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | — | ✅ |

**Selection values (from Odoo source)**

| Field | Values |
|---|---|
| `privacy_visibility` | `followers` · `employees` · `portal` |
| `billing_type` | `task_rate` · `fixed_rate` · `employee_rate` |
| `last_update_status` | `on_track` · `at_risk` · `off_track` · `on_hold` · `to_define` |

### 1.2 `search_read` Field List

```python
# apps/projects/views.py
PROJECT_FIELDS = [
    "id", "name", "active", "color",
    "partner_id", "user_id",
    "date_start", "date",
    "description",
    "privacy_visibility",
    "allow_timesheets", "allow_milestones",
    "allow_recurring_tasks", "allow_task_dependencies",
    "allow_billable", "billing_type",
    "allocated_hours",
    "account_id", "alias_name",
    "last_update_status", "last_update_id",
    "stage_id", "is_template", "is_favorite",
    "tag_ids", "favorite_user_ids",
]
# Do NOT request: milestone_ids, collaborator_ids, message_ids, activity_ids
# — fetch those through their own endpoints to avoid huge payloads.
```

### 1.3 DRF Serializer

```python
# apps/projects/serializers.py
from rest_framework import serializers

class ProjectSerializer(serializers.Serializer):
    id               = serializers.IntegerField(read_only=True)
    name             = serializers.CharField(max_length=256)
    active           = serializers.BooleanField(default=True)
    color            = serializers.IntegerField(default=0)
    partner_id       = serializers.ListField(child=serializers.IntegerField(),
                           allow_null=True, required=False)   # [id, name] from Odoo
    user_id          = serializers.ListField(child=serializers.IntegerField(),
                           allow_null=True, required=False)
    date_start       = serializers.DateField(allow_null=True, required=False)
    date             = serializers.DateField(allow_null=True, required=False)
    description      = serializers.CharField(allow_blank=True, required=False)
    privacy_visibility = serializers.ChoiceField(
                           choices=["followers", "employees", "portal"],
                           default="employees")
    allow_timesheets = serializers.BooleanField(default=False)
    allow_milestones = serializers.BooleanField(default=False)
    allow_recurring_tasks    = serializers.BooleanField(default=False)
    allow_task_dependencies  = serializers.BooleanField(default=False)
    allow_billable   = serializers.BooleanField(default=False)
    billing_type     = serializers.ChoiceField(
                           choices=["task_rate", "fixed_rate", "employee_rate"],
                           required=False)
    allocated_hours  = serializers.FloatField(default=0.0)
    alias_name       = serializers.CharField(allow_blank=True, required=False)
    last_update_status = serializers.ChoiceField(
                           choices=["on_track","at_risk","off_track","on_hold","to_define"],
                           read_only=True)
    stage_id         = serializers.ListField(child=serializers.IntegerField(),
                           allow_null=True, required=False)
    is_template      = serializers.BooleanField(default=False)
    tag_ids          = serializers.ListField(child=serializers.IntegerField(),
                           default=list)
```

### 1.4 Common Domain Filters

```python
# All active non-template projects
[["active", "=", True], ["is_template", "=", False]]

# Projects for a specific customer
[["partner_id", "=", customer_id]]

# Projects the user is a member of (favorites)
[["favorite_user_ids", "in", [uid]]]

# Template projects only (for Sales order auto-create)
[["is_template", "=", True]]

# Projects in a specific global stage
[["stage_id", "=", stage_id]]

# Billable projects only
[["allow_billable", "=", True]]
```

---

## 2. `project.task.type` → `Stage` (Kanban stages for tasks)

> ⚠️ This is **not** the global project pipeline. This is the Kanban column header inside a project. One stage can belong to many projects via `project_ids`.

### 2.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Name | char | — | ✅ | — |
| `sequence` | Sequence | integer | — | — | — |
| `fold` | Folded | boolean | — | — | — |
| `color` | Color | integer | — | — | — |
| `project_ids` | Projects | many2many | `project.project` | — | — |
| `user_id` | Stage Owner | many2one | `res.users` | — | — |
| `mail_template_id` | Email Template | many2one | `mail.template` | — | — |
| `sms_template_id` | SMS Template | many2one | `sms.template` | — | — |
| `auto_validation_state` | Auto Kanban Status | boolean | — | — | — |
| `rating_active` | Send Rating Request | boolean | — | — | — |
| `rating_template_id` | Rating Email Template | many2one | `mail.template` | — | — |
| `rating_status` | Ratings Status | selection | — | ✅ | — |
| `rating_status_period` | Rating Frequency | selection | — | ✅ | — |
| `rotting_threshold_days` | Days to rot | integer | — | — | — |

**Selection values**

| Field | Values |
|---|---|
| `rating_status` | `stage` · `periodic` · `no` |
| `rating_status_period` | `once` · `daily` · `weekly` · `monthly` |

### 2.2 `search_read` Field List

```python
STAGE_FIELDS = [
    "id", "name", "sequence", "fold", "color",
    "project_ids", "user_id",
    "mail_template_id", "sms_template_id",
    "auto_validation_state",
    "rating_active", "rating_template_id",
    "rating_status", "rating_status_period",
    "rotting_threshold_days",
]
```

### 2.3 DRF Serializer

```python
# apps/projects/serializers.py
class StageSerializer(serializers.Serializer):
    id                    = serializers.IntegerField(read_only=True)
    name                  = serializers.CharField(max_length=256)
    sequence              = serializers.IntegerField(default=10)
    fold                  = serializers.BooleanField(default=False)
    color                 = serializers.IntegerField(default=0)
    project_ids           = serializers.ListField(child=serializers.IntegerField(),
                               default=list)
    auto_validation_state = serializers.BooleanField(default=False)
    rating_active         = serializers.BooleanField(default=False)
    rating_status         = serializers.ChoiceField(
                               choices=["stage", "periodic", "no"], default="no")
    rating_status_period  = serializers.ChoiceField(
                               choices=["once", "daily", "weekly", "monthly"],
                               required=False)
    rotting_threshold_days = serializers.IntegerField(default=0)
```

### 2.4 Common Domain Filters

```python
# All stages belonging to a specific project
[["project_ids", "in", [project_id]]]

# Stages ordered for Kanban rendering
# → always add order="sequence asc" in kwargs, not as a domain
```

---

## 3. `project.task` → `Task`

### 3.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Title | char | — | ✅ | ✅ |
| `active` | Active | boolean | — | — | — |
| `color` | Color Index | integer | — | — | — |
| `project_id` | Project | many2one | `project.project` | — | ✅ |
| `stage_id` | Stage | many2one | `project.task.type` | — | ✅ |
| `state` | State | selection | — | ✅ | ✅ |
| `user_ids` | Assignees | many2many | `res.users` | — | — |
| `partner_id` | Customer | many2one | `res.partner` | — | ✅ |
| `priority` | Priority | selection | — | — | ✅ |
| `date_deadline` | Deadline | datetime | — | — | ✅ |
| `planned_date_begin` | Start date | datetime | — | — | — |
| `date_end` | Ending Date | datetime | — | — | ✅ |
| `date_last_stage_update` | Last Stage Update | datetime | — | — | ✅ |
| `date_assign` | Assigning Date | datetime | — | — | — |
| `allocated_hours` | Allocated Time | float | — | — | — |
| `effective_hours` | Time Spent | float | — | — | — |
| `remaining_hours` | Time Remaining | float | — | — | — |
| `overtime` | Overtime | float | — | — | — |
| `progress` | Progress | float | — | — | — |
| `description` | Description | html | — | — | — |
| `tag_ids` | Tags | many2many | `project.tags` | — | — |
| `parent_id` | Parent Task | many2one | `project.task` | — | ✅ |
| `child_ids` | Sub-tasks | one2many | `project.task` | — | — |
| `depend_on_ids` | Blocked By | many2many | `project.task` | — | — |
| `dependent_ids` | Blocks | many2many | `project.task` | — | — |
| `milestone_id` | Milestone | many2one | `project.milestone` | — | ✅ |
| `recurrence_id` | Recurrence | many2one | `project.task.recurrence` | — | ✅ |
| `recurring_task` | Recurrent | boolean | — | — | — |
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | — | ✅ |
| `displayed_image_id` | Cover Image | many2one | `ir.attachment` | — | — |
| `display_in_project` | Display In Project | boolean | — | — | — |
| `email_from` | Email From | char | — | — | — |
| `email_cc` | Email CC | char | — | — | — |
| `rating_last_value` | Rating Last Value | float | — | — | — |
| `access_token` | Security Token | char | — | — | — |

**Selection values**

| Field | Values |
|---|---|
| `priority` | `0` (Normal) · `1` (Starred/High) |
| `state` | `01_in_progress` · `02_changes_requested` · `03_approved` · `04_waiting_normal` · `1_done` · `1_canceled` |

> ⚠️ `state` is the **Kanban status dot** (On Track, Changes Requested, Approved etc.), **not** the Kanban stage column. These are independent.

### 3.2 `search_read` Field List

```python
# apps/tasks/views.py
TASK_FIELDS = [
    "id", "name", "active", "color",
    "project_id", "stage_id", "state",
    "user_ids", "partner_id",
    "priority",
    "date_deadline", "planned_date_begin", "date_end",
    "allocated_hours", "effective_hours", "remaining_hours", "overtime",
    "progress",
    "description",
    "tag_ids",
    "parent_id", "child_ids",
    "depend_on_ids", "dependent_ids",
    "milestone_id",
    "recurring_task", "recurrence_id",
    "sale_line_id",
    "display_in_project",
    "rating_last_value",
    "access_token",
]
# child_ids returns list of IDs — fetch subtasks via separate endpoint.
# depend_on_ids / dependent_ids return lists of IDs — render as blocked-by badges.
```

### 3.3 DRF Serializer

```python
# apps/tasks/serializers.py
from rest_framework import serializers

TASK_STATE_CHOICES = [
    "01_in_progress", "02_changes_requested", "03_approved",
    "04_waiting_normal", "1_done", "1_canceled",
]

class TaskSerializer(serializers.Serializer):
    id                  = serializers.IntegerField(read_only=True)
    name                = serializers.CharField(max_length=512)
    active              = serializers.BooleanField(default=True)
    color               = serializers.IntegerField(default=0)
    project_id          = serializers.IntegerField(allow_null=True, required=False)
    stage_id            = serializers.IntegerField(allow_null=True, required=False)
    state               = serializers.ChoiceField(choices=TASK_STATE_CHOICES,
                             default="01_in_progress")
    user_ids            = serializers.ListField(child=serializers.IntegerField(),
                             default=list)
    partner_id          = serializers.IntegerField(allow_null=True, required=False)
    priority            = serializers.ChoiceField(choices=["0", "1"], default="0")
    date_deadline       = serializers.DateTimeField(allow_null=True, required=False)
    planned_date_begin  = serializers.DateTimeField(allow_null=True, required=False)
    date_end            = serializers.DateTimeField(allow_null=True, required=False)
    allocated_hours     = serializers.FloatField(default=0.0)
    effective_hours     = serializers.FloatField(read_only=True)
    remaining_hours     = serializers.FloatField(read_only=True)
    overtime            = serializers.FloatField(read_only=True)
    progress            = serializers.FloatField(read_only=True)
    description         = serializers.CharField(allow_blank=True, required=False)
    tag_ids             = serializers.ListField(child=serializers.IntegerField(),
                             default=list)
    parent_id           = serializers.IntegerField(allow_null=True, required=False)
    child_ids           = serializers.ListField(child=serializers.IntegerField(),
                             read_only=True)
    depend_on_ids       = serializers.ListField(child=serializers.IntegerField(),
                             default=list)
    dependent_ids       = serializers.ListField(child=serializers.IntegerField(),
                             read_only=True)
    milestone_id        = serializers.IntegerField(allow_null=True, required=False)
    recurring_task      = serializers.BooleanField(default=False)
    recurrence_id       = serializers.IntegerField(allow_null=True, required=False)
    sale_line_id        = serializers.IntegerField(allow_null=True, required=False)
    rating_last_value   = serializers.FloatField(read_only=True)

    def to_write_payload(self, validated_data):
        """
        Odoo write() needs many2many fields as command lists.
        Call this before passing data to odoo_call("project.task", "write", ...).
        """
        payload = dict(validated_data)
        if "user_ids" in payload:
            payload["user_ids"] = [(6, 0, payload["user_ids"])]   # replace all
        if "tag_ids" in payload:
            payload["tag_ids"] = [(6, 0, payload["tag_ids"])]
        if "depend_on_ids" in payload:
            payload["depend_on_ids"] = [(6, 0, payload["depend_on_ids"])]
        return payload
```

> **Many2many write command**: `(6, 0, [ids])` = replace entire set. Use `(4, id)` to add one, `(3, id)` to remove one without touching others.

### 3.4 Common Domain Filters

```python
# All active tasks in a project
[["project_id", "=", project_id], ["active", "=", True]]

# Tasks in one Kanban column
[["project_id", "=", project_id], ["stage_id", "=", stage_id]]

# Subtasks of a task
[["parent_id", "=", task_id]]

# Top-level tasks only (no subtasks)
[["project_id", "=", project_id], ["parent_id", "=", False]]

# Tasks assigned to a user
[["user_ids", "in", [uid]]]

# High priority tasks
[["project_id", "=", project_id], ["priority", "=", "1"]]

# Tasks blocked by dependencies
[["depend_on_ids", "!=", False]]

# Recurring tasks
[["recurring_task", "=", True]]

# Tasks linked to a milestone
[["milestone_id", "=", milestone_id]]

# Done tasks (for archive display)
[["project_id", "=", project_id], ["active", "=", False]]

# Tasks with overdue deadline
[["date_deadline", "<", "2026-03-28 00:00:00"], ["state", "not in", ["1_done", "1_canceled"]]]
```

---

## 4. `project.task.recurrence` → `Recurrence`

### 4.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `repeat_interval` | Repeat Every | integer | — | — | — |
| `repeat_unit` | Repeat Unit | selection | — | — | — |
| `repeat_type` | Until | selection | — | — | — |
| `repeat_until` | End Date | date | — | — | — |
| `task_ids` | Tasks | one2many | `project.task` | — | — |

**Selection values**

| Field | Values |
|---|---|
| `repeat_unit` | `day` · `week` · `month` · `year` |
| `repeat_type` | `forever` · `until` |

### 4.2 `search_read` Field List

```python
RECURRENCE_FIELDS = [
    "id", "repeat_interval", "repeat_unit",
    "repeat_type", "repeat_until", "task_ids",
]
```

### 4.3 DRF Serializer

```python
# apps/tasks/serializers.py
class RecurrenceSerializer(serializers.Serializer):
    id              = serializers.IntegerField(read_only=True)
    repeat_interval = serializers.IntegerField(default=1)
    repeat_unit     = serializers.ChoiceField(
                         choices=["day", "week", "month", "year"],
                         default="week")
    repeat_type     = serializers.ChoiceField(
                         choices=["forever", "until"],
                         default="forever")
    repeat_until    = serializers.DateField(allow_null=True, required=False)
```

> **Note**: Recurrence is created by writing `recurring_task=True` and the `repeat_*` fields directly on `project.task`. Odoo auto-creates the `project.task.recurrence` record. You only read recurrence directly when you need to edit the recurrence series.

---

## 5. `project.milestone` → `Milestone`

### 5.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Name | char | — | ✅ | — |
| `sequence` | Sequence | integer | — | — | — |
| `project_id` | Project | many2one | `project.project` | ✅ | — |
| `deadline` | Deadline | date | — | — | — |
| `is_reached` | Reached | boolean | — | — | — |
| `reached_date` | Reached Date | date | — | — | — |
| `quantity_percentage` | Quantity (%) | float | — | — | — |
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | — | — |
| `task_ids` | Tasks | one2many | `project.task` | — | — |

### 5.2 `search_read` Field List

```python
MILESTONE_FIELDS = [
    "id", "name", "sequence",
    "project_id", "deadline",
    "is_reached", "reached_date",
    "quantity_percentage",
    "sale_line_id",
    "task_ids",
]
```

### 5.3 DRF Serializer

```python
# apps/milestones/serializers.py
class MilestoneSerializer(serializers.Serializer):
    id                  = serializers.IntegerField(read_only=True)
    name                = serializers.CharField(max_length=256)
    sequence            = serializers.IntegerField(default=10)
    project_id          = serializers.IntegerField()
    deadline            = serializers.DateField(allow_null=True, required=False)
    is_reached          = serializers.BooleanField(default=False)
    reached_date        = serializers.DateField(read_only=True)
    quantity_percentage = serializers.FloatField(default=0.0)
    sale_line_id        = serializers.IntegerField(allow_null=True, required=False)
    task_ids            = serializers.ListField(child=serializers.IntegerField(),
                             read_only=True)
```

### 5.4 Common Domain Filters

```python
# All milestones for a project ordered by deadline
[["project_id", "=", project_id]]
# kwargs: order="deadline asc"

# Unreached milestones only
[["project_id", "=", project_id], ["is_reached", "=", False]]

# Overdue milestones
[["deadline", "<", "2026-03-28"], ["is_reached", "=", False]]
```

---

## 6. `project.update` → `ProjectUpdate`

### 6.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Title | char | — | ✅ | — |
| `date` | Date | date | — | — | — |
| `project_id` | Project | many2one | `project.project` | — | — |
| `user_id` | Author | many2one | `res.users` | ✅ | — |
| `status` | Status | selection | — | ✅ | — |
| `progress` | Progress | integer | — | — | — |
| `description` | Description | html | — | — | — |
| `allocated_time` | Allocated Time | integer | — | — | — |
| `task_count` | Task Count | integer | — | — | — |
| `closed_task_count` | Closed Task Count | integer | — | — | — |
| `timesheet_time` | Timesheet Time | integer | — | — | — |

**Selection values**

| Field | Values |
|---|---|
| `status` | `on_track` · `at_risk` · `off_track` · `on_hold` |

### 6.2 `search_read` Field List

```python
UPDATE_FIELDS = [
    "id", "name", "date",
    "project_id", "user_id", "status",
    "progress", "description",
    "allocated_time", "task_count",
    "closed_task_count", "timesheet_time",
]
```

### 6.3 DRF Serializer

```python
# apps/updates/serializers.py
class ProjectUpdateSerializer(serializers.Serializer):
    id                = serializers.IntegerField(read_only=True)
    name              = serializers.CharField(max_length=256)
    date              = serializers.DateField(required=False)
    project_id        = serializers.IntegerField()
    user_id           = serializers.IntegerField(required=False)
    status            = serializers.ChoiceField(
                           choices=["on_track","at_risk","off_track","on_hold"])
    progress          = serializers.IntegerField(min_value=0, max_value=100, default=0)
    description       = serializers.CharField(allow_blank=True, required=False)
    allocated_time    = serializers.IntegerField(read_only=True)
    task_count        = serializers.IntegerField(read_only=True)
    closed_task_count = serializers.IntegerField(read_only=True)
    timesheet_time    = serializers.IntegerField(read_only=True)
```

### 6.4 Common Domain Filters

```python
# All updates for a project, latest first
[["project_id", "=", project_id]]
# kwargs: order="date desc", limit=10
```

---

## 7. `account.analytic.line` → `Timesheet`

> This is the **only** model for timesheets. There is no `project.timesheet` in Odoo.  
> Filter by `project_id != False` to get only project timesheets (not leave or other analytic lines).

### 7.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Description | char | — | — | — |
| `date` | Date | date | — | — | — |
| `project_id` | Project | many2one | `project.project` | — | — |
| `task_id` | Task | many2one | `project.task` | — | — |
| `employee_id` | Employee | many2one | `hr.employee` | — | — |
| `user_id` | User | many2one | `res.users` | — | — |
| `unit_amount` | Quantity (hours) | float | — | — | — |
| `amount` | Amount (cost) | monetary | — | — | — |
| `currency_id` | Currency | many2one | `res.currency` | — | — |
| `so_line` | Sales Order Item | many2one | `sale.order.line` | — | — |
| `timesheet_invoice_id` | Invoice | many2one | `account.move` | — | — |
| `timesheet_invoice_type` | Billable Type | selection | — | — | — |
| `parent_task_id` | Parent Task | many2one | `project.task` | — | — |
| `partner_id` | Partner | many2one | `res.partner` | — | — |
| `validated` | Validated | boolean | — | — | — |
| `x_timesheet_state` | Timesheet Status | selection | — | — | — |
| `is_so_line_edited` | SO Item Manually Edited | boolean | — | — | — |

**Selection values**

| Field | Values |
|---|---|
| `timesheet_invoice_type` | `non_billable` · `billable_time` · `billable_fixed` · `billable_milestone` |
| `x_timesheet_state` | custom — check your Odoo instance |

### 7.2 `search_read` Field List

```python
TIMESHEET_FIELDS = [
    "id", "name", "date",
    "project_id", "task_id", "parent_task_id",
    "employee_id", "user_id",
    "unit_amount", "amount", "currency_id",
    "so_line", "timesheet_invoice_id",
    "timesheet_invoice_type",
    "validated",
]
```

### 7.3 DRF Serializer

```python
# apps/timesheets/serializers.py
class TimesheetSerializer(serializers.Serializer):
    id                     = serializers.IntegerField(read_only=True)
    name                   = serializers.CharField(allow_blank=True, default="/")
    date                   = serializers.DateField()
    project_id             = serializers.IntegerField()
    task_id                = serializers.IntegerField(allow_null=True, required=False)
    employee_id            = serializers.IntegerField()
    unit_amount            = serializers.FloatField(min_value=0.0)   # hours
    amount                 = serializers.FloatField(read_only=True)  # auto-calc by Odoo
    timesheet_invoice_type = serializers.ChoiceField(
                                choices=["non_billable","billable_time",
                                         "billable_fixed","billable_milestone"],
                                read_only=True)
    validated              = serializers.BooleanField(read_only=True)
    so_line                = serializers.IntegerField(read_only=True, allow_null=True)
    timesheet_invoice_id   = serializers.IntegerField(read_only=True, allow_null=True)
```

### 7.4 Common Domain Filters

```python
# All timesheets for a project
[["project_id", "=", project_id]]

# Timesheets for a specific task
[["task_id", "=", task_id]]

# Timesheets for a user in a date range
[["user_id", "=", uid],
 ["date", ">=", "2026-03-01"],
 ["date", "<=", "2026-03-31"]]

# Unvalidated timesheets pending approval
[["project_id", "=", project_id], ["validated", "=", False]]

# Billable timesheets not yet invoiced
[["project_id", "=", project_id],
 ["timesheet_invoice_type", "!=", "non_billable"],
 ["timesheet_invoice_id", "=", False]]
```

---

## 8. `project.project.stage` → `ProjectStage` (Global pipeline)

> ⚠️ This is the **global** project board (e.g. New → In Progress → Done). Different from `project.task.type` which is per-task Kanban.

### 8.1 Field Table

| Field name | Label | Type | Relation | Required | Indexed |
|---|---|---|---|---|---|
| `id` | ID | integer | — | — | — |
| `name` | Name | char | — | ✅ | — |
| `sequence` | Sequence | integer | — | — | — |
| `fold` | Folded | boolean | — | — | — |
| `color` | Color | integer | — | — | — |
| `mail_template_id` | Email Template | many2one | `mail.template` | — | — |
| `sms_template_id` | SMS Template | many2one | `sms.template` | — | — |
| `company_id` | Company | many2one | `res.company` | — | — |

### 8.2 `search_read` Field List

```python
PROJECT_STAGE_FIELDS = [
    "id", "name", "sequence", "fold", "color",
    "mail_template_id", "sms_template_id",
]
```

### 8.3 DRF Serializer

```python
class ProjectStageSerializer(serializers.Serializer):
    id               = serializers.IntegerField(read_only=True)
    name             = serializers.CharField(max_length=256)
    sequence         = serializers.IntegerField(default=10)
    fold             = serializers.BooleanField(default=False)
    color            = serializers.IntegerField(default=0)
    mail_template_id = serializers.IntegerField(allow_null=True, required=False)
```

---

## 9. `project.tags` → `Tag`

### 9.1 Field Table

| Field name | Label | Type | Relation |
|---|---|---|---|
| `id` | ID | integer | — |
| `name` | Name | char | — |
| `color` | Color | integer | — |
| `project_ids` | Projects | many2many | `project.project` |
| `task_ids` | Tasks | many2many | `project.task` |

### 9.2 `search_read` Field List

```python
TAG_FIELDS = ["id", "name", "color"]
```

### 9.3 DRF Serializer

```python
class TagSerializer(serializers.Serializer):
    id    = serializers.IntegerField(read_only=True)
    name  = serializers.CharField(max_length=64)
    color = serializers.IntegerField(default=0)
```

### 9.4 Common Domain Filters

```python
# Tags used in a specific project (tasks)
[["task_ids.project_id", "=", project_id]]

# All available tags (for tag picker dropdown)
[]   # empty domain = all records; add limit=100
```

---

## 10. `project.collaborator` → `Collaborator`

Tracks **portal users** who have been granted access to a project.

### 10.1 Field Table

| Field name | Label | Type | Relation | Required |
|---|---|---|---|---|
| `id` | ID | integer | — | — |
| `project_id` | Project Shared | many2one | `project.project` | ✅ |
| `partner_id` | Collaborator | many2one | `res.partner` | ✅ |
| `limited_access` | Limited Access | boolean | — |

### 10.2 `search_read` Field List

```python
COLLABORATOR_FIELDS = ["id", "project_id", "partner_id", "limited_access"]
```

### 10.3 DRF Serializer

```python
class CollaboratorSerializer(serializers.Serializer):
    id             = serializers.IntegerField(read_only=True)
    project_id     = serializers.IntegerField()
    partner_id     = serializers.IntegerField()
    limited_access = serializers.BooleanField(default=False)
```

---

## 11. `project.task.stage.personal` → `PersonalStage`

Maps a specific user's personal Kanban column to a task. Allows each user to have their own stage view without affecting the shared project stage.

### 11.1 Field Table

| Field name | Label | Type | Relation | Required |
|---|---|---|---|---|
| `id` | ID | integer | — | — |
| `task_id` | Task | many2one | `project.task` | ✅ |
| `stage_id` | Stage | many2one | `project.task.type` | — |
| `user_id` | User | many2one | `res.users` | ✅ |

### 11.2 `search_read` Field List

```python
PERSONAL_STAGE_FIELDS = ["id", "task_id", "stage_id", "user_id"]
```

### 11.3 Common Domain Filters

```python
# Personal stages for the logged-in user
[["user_id", "=", uid]]
```

---

## 12. `mail.activity` → `Activity`

Activities are scheduled actions on any record (task, project, etc.) — calls, meetings, emails, to-dos.

### 12.1 Field Table (stored fields used by Project)

| Field name | Label | Type | Relation | Required |
|---|---|---|---|---|
| `id` | ID | integer | — | — |
| `activity_type_id` | Activity Type | many2one | `mail.activity.type` | — |
| `res_model` | Related Model | char | — | — |
| `res_id` | Related Document ID | many2one_reference | — | — |
| `res_name` | Document Name | char | — | — |
| `user_id` | Responsible | many2one | `res.users` | — |
| `date_deadline` | Due Date | date | — | — |
| `date_done` | Done Date | date | — | — |
| `note` | Note | html | — | — |
| `feedback` | Feedback | text | — | — |
| `automated` | Automated | boolean | — | — |
| `calendar_event_id` | Calendar Meeting | many2one | `calendar.event` | — |
| `attachment_ids` | Attachments | many2many | `ir.attachment` | — |

### 12.2 `search_read` Field List

```python
ACTIVITY_FIELDS = [
    "id", "activity_type_id",
    "res_model", "res_id", "res_name",
    "user_id", "date_deadline", "date_done",
    "note", "feedback", "automated",
    "calendar_event_id",
]
```

### 12.3 DRF Serializer

```python
# apps/tasks/serializers.py (activities are always in context of a task)
class ActivitySerializer(serializers.Serializer):
    id                = serializers.IntegerField(read_only=True)
    activity_type_id  = serializers.IntegerField(required=False, allow_null=True)
    res_model         = serializers.CharField(read_only=True)
    res_id            = serializers.IntegerField()          # task or project id
    user_id           = serializers.IntegerField(required=False)
    date_deadline     = serializers.DateField()
    note              = serializers.CharField(allow_blank=True, required=False)
    feedback          = serializers.CharField(allow_blank=True, required=False)
```

### 12.4 Common Domain Filters

```python
# Activities on a specific task
[["res_model", "=", "project.task"], ["res_id", "=", task_id]]

# Activities assigned to the current user across all tasks
[["res_model", "=", "project.task"], ["user_id", "=", uid]]

# Overdue activities
[["date_deadline", "<", "2026-03-28"], ["date_done", "=", False]]

# Activities on a project record itself
[["res_model", "=", "project.project"], ["res_id", "=", project_id]]
```

---

## Appendix A — Many2many Write Command Cheatsheet

When writing many2many fields via XML-RPC (`project.task → user_ids`, `tag_ids`, `depend_on_ids`):

| Command | Tuple | Effect |
|---|---|---|
| Replace all | `(6, 0, [1, 2, 3])` | Set field to exactly `[1,2,3]`, removes all previous |
| Add one | `(4, id, 0)` | Add record `id` without removing others |
| Remove one | `(3, id, 0)` | Remove record `id` without removing others |
| Clear all | `(5, 0, 0)` | Remove all linked records |

```python
# Example: add tag 7 without touching other tags
odoo_call("project.task", "write", [
    [task_id],
    {"tag_ids": [(4, 7, 0)]}
])

# Example: set assignees to only user 3 and user 5
odoo_call("project.task", "write", [
    [task_id],
    {"user_ids": [(6, 0, [3, 5])]}
])
```

---

## Appendix B — Model Relationship Diagram

```
project.project.stage
        │ stage_id (indexed)
        ▼
  project.project ──────────────────────────────┐
        │ project_id (indexed)                  │
        ▼                                       │
  project.task ←── parent_id (self M2O)        │
        │                                       │
        ├── stage_id ──► project.task.type      │
        ├── milestone_id ──► project.milestone ◄┘
        ├── recurrence_id ──► project.task.recurrence
        ├── depend_on_ids ──► project.task (M2M self)
        ├── user_ids ──► res.users (M2M)
        ├── tag_ids ──► project.tags (M2M)
        └── activity_ids ──► mail.activity
                │
account.analytic.line ──► project.task (task_id)
  (Timesheets)        ──► project.project (project_id)
```

---

## Appendix C — Fields You Must NEVER Write (read-only in Odoo)

These fields are computed by Odoo server-side. Sending them in a `create` or `write` call will either throw an error or be silently ignored, wasting your API call.

| Model | Field | Why read-only |
|---|---|---|
| `project.task` | `effective_hours` | Sum of `account.analytic.line.unit_amount` |
| `project.task` | `remaining_hours` | `allocated_hours - effective_hours` |
| `project.task` | `overtime` | `effective_hours - allocated_hours` |
| `project.task` | `progress` | Calculated from subtask completion |
| `project.task` | `date_last_stage_update` | Set by Odoo on stage change |
| `project.task` | `date_assign` | Set by Odoo when `user_ids` first set |
| `project.task` | `dependent_ids` | Inverse of `depend_on_ids` |
| `project.milestone` | `reached_date` | Set by Odoo when `is_reached=True` |
| `project.milestone` | `task_ids` | Inverse — link via `project.task.milestone_id` |
| `account.analytic.line` | `amount` | `unit_amount × employee hourly cost` |
| `account.analytic.line` | `timesheet_invoice_type` | Set by billing policy on project |
| `account.analytic.line` | `validated` | Set by timesheet validation workflow |
| `project.update` | `task_count` | Computed from project tasks |
| `project.update` | `closed_task_count` | Computed from done/cancelled tasks |
| `project.update` | `allocated_time` | Copied from `project.allocated_hours` |
