# Skill: Reporting — Antigravity

**Odoo models**: `project.task` · `account.analytic.line` · `rating.rating` · `project.task.burndown.chart.report`  
**CSV source**: `edu-primesoft` — 24,749-row export, 26 Mar 2026  
**Stack**: Django DRF → `odoo_call()` → Odoo XML-RPC  

---

## What "Reporting" Covers in Odoo Project

Odoo Project has three completely separate reporting surfaces. They are different models, different endpoints, different groupings — do not mix them up.

| # | Surface | Odoo Model | Transcript reference |
|---|---|---|---|
| 1 | **Task Analysis** | `project.task` | Video 2 (stages/status overview) |
| 2 | **Timesheet Reporting** | `account.analytic.line` | Videos 13, 14, 17 (leaderboard, profitability) |
| 3 | **Customer Ratings** | `rating.rating` | Video 18 |
| 4 | **Burndown Chart** | `project.task.burndown.chart.report` | (bonus — Odoo built-in report) |

---

## Part 1 — Task Analysis (`project.task`)

### 1.1 What It Is

Task Analysis is a pivot/graph view over all tasks. You group by any stored field and aggregate counts or hours. In Antigravity this powers:

- "How many tasks are at risk per project?"
- "Which assignee has the most open tasks?"
- "How many tasks are overdue per stage?"
- "What's the completion rate per milestone?"

### 1.2 Groupable Fields (stored, from CSV)

These are the `project.task` fields you can safely pass to `group_by` in `read_group`. All are `store=True`.

| Odoo Field | Label | Type | Typical Group-By Use |
|---|---|---|---|
| `project_id` | Project | many2one | "Tasks per project" |
| `stage_id` | Stage | many2one | "Tasks per Kanban column" |
| `state` | Status | selection | "Tasks by status dot (In Progress / Done / Blocked…)" |
| `priority` | Priority | selection | "Starred vs Normal tasks" |
| `user_ids` | Assignees | many2many | Note: many2many groupby has limitations — see §1.5 |
| `partner_id` | Customer | many2one | "Tasks per customer" |
| `milestone_id` | Milestone | many2one | "Tasks per milestone" |
| `tag_ids` | Tags | many2many | Note: many2many groupby has limitations — see §1.5 |
| `date_deadline` | Deadline | datetime | Group by week/month: `date_deadline:week` |
| `date_last_stage_update` | Last Stage Update | datetime | "Tasks not moved in N days" |
| `create_date` | Created On | datetime | "Tasks created this week" |
| `recurring_task` | Recurrent | boolean | "Recurring vs one-off tasks" |
| `active` | Active | boolean | "Open vs archived tasks" |

### 1.3 Aggregatable Fields (stored, from CSV)

These are the numeric fields you sum or average in `read_group`.

| Odoo Field | Label | Type | store | readonly | Aggregate |
|---|---|---|---|---|---|
| `allocated_hours` | Allocated Time | float | ✅ | ❌ | sum — total planned hours |
| `effective_hours` | Time Spent | float | ✅ | ✅ | sum — total logged hours |
| `remaining_hours` | Time Remaining | float | ✅ | ✅ | sum |
| `overtime` | Overtime | float | ✅ | ✅ | sum |
| `progress` | Progress | float | ✅ | ✅ | avg — average completion % |
| `subtask_effective_hours` | Subtask Time Spent | float | ✅ | ✅ | sum |
| `total_hours_spent` | Total Time Spent | float | ✅ | ✅ | sum |

### 1.4 `search_read` Field Set for Task Reports

```python
# apps/reporting/constants.py

TASK_REPORT_FIELDS = [
    "id",
    "name",
    "project_id",
    "stage_id",
    "state",
    "priority",
    "partner_id",
    "milestone_id",
    "date_deadline",
    "date_last_stage_update",
    "create_date",
    "allocated_hours",
    "effective_hours",
    "remaining_hours",
    "overtime",
    "progress",
    "recurring_task",
    "active",
    "tag_ids",
    "user_ids",
]
```

### 1.5 `read_group` Calls

`read_group` is the XML-RPC method for aggregated data. Signature:

```python
odoo_call(model, "read_group", [domain, fields, groupby], {"orderby": ..., "limit": ...})
```

**Task count per stage (Kanban column totals)**

```python
odoo_call("project.task", "read_group",
    [[["project_id", "=", project_id], ["active", "=", True]]],
    ["stage_id", "__count"],
    ["stage_id"],
    {"orderby": "stage_id asc"}
)
# Returns: [{"stage_id": [id, name], "__count": N}, ...]
```

**Task count grouped by status dot**

```python
odoo_call("project.task", "read_group",
    [[["project_id", "=", project_id], ["active", "=", True]]],
    ["state", "__count"],
    ["state"],
)
# Returns: [{"state": "01_in_progress", "__count": 4}, ...]
```

**Allocated vs spent hours per project (portfolio view)**

```python
odoo_call("project.task", "read_group",
    [[["active", "=", True]]],
    ["project_id", "allocated_hours:sum", "effective_hours:sum", "overtime:sum"],
    ["project_id"],
    {"orderby": "project_id asc"}
)
```

**Tasks overdue (deadline passed, not done)**

```python
from datetime import date

odoo_call("project.task", "search_read",
    [[
        ["date_deadline", "<", date.today().strftime("%Y-%m-%d %H:%M:%S")],
        ["state", "not in", ["1_done", "1_canceled"]],
        ["active", "=", True],
    ]],
    {"fields": TASK_REPORT_FIELDS, "order": "date_deadline asc"}
)
```

**Tasks per assignee (open only) — count by user**

```python
# Note: user_ids is many2many — group_by on many2many uses a special join
# Safer to use search_read and aggregate in Python for this case
tasks = odoo_call("project.task", "search_read",
    [[["active", "=", True], ["project_id", "=", project_id]]],
    {"fields": ["id", "user_ids", "state"]}
)
# Then aggregate in Python: { user_id: count } from user_ids lists
```

**Progress per milestone**

```python
odoo_call("project.task", "read_group",
    [[["milestone_id", "!=", False], ["project_id", "=", project_id]]],
    ["milestone_id", "__count", "effective_hours:sum", "allocated_hours:sum"],
    ["milestone_id"],
)
```

### 1.6 DRF Endpoint

```python
# apps/reporting/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from services.odoo_client import odoo_call
from .constants import TASK_REPORT_FIELDS

class TaskReportViewSet(ViewSet):

    @action(detail=False, methods=["get"], url_path="by-stage")
    def by_stage(self, request):
        project_id = int(request.query_params.get("project_id", 0))
        domain = [["project_id", "=", project_id], ["active", "=", True]]
        result = odoo_call("project.task", "read_group",
            [domain, ["stage_id", "__count"], ["stage_id"]],
            {"orderby": "stage_id asc"}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="by-status")
    def by_status(self, request):
        project_id = int(request.query_params.get("project_id", 0))
        domain = [["project_id", "=", project_id], ["active", "=", True]]
        result = odoo_call("project.task", "read_group",
            [domain, ["state", "__count"], ["state"]], {}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        from datetime import date
        project_id = int(request.query_params.get("project_id", 0))
        domain = [
            ["project_id", "=", project_id],
            ["date_deadline", "<", date.today().strftime("%Y-%m-%d %H:%M:%S")],
            ["state", "not in", ["1_done", "1_canceled"]],
            ["active", "=", True],
        ]
        result = odoo_call("project.task", "search_read",
            [domain],
            {"fields": TASK_REPORT_FIELDS, "order": "date_deadline asc"}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="hours-summary")
    def hours_summary(self, request):
        """Portfolio view: allocated vs spent per project."""
        result = odoo_call("project.task", "read_group",
            [[["active", "=", True]],
             ["project_id", "allocated_hours:sum", "effective_hours:sum", "overtime:sum"],
             ["project_id"]],
            {"orderby": "project_id asc"}
        )
        return Response(result)
```

### 1.7 State Values Reference (for filter chips in React)

```javascript
// src/utils/odooStatus.js

export const TASK_STATE_OPTIONS = [
  { value: "01_in_progress", label: "In Progress",          color: "#6b7280" },
  { value: "02_changes_requested", label: "Changes Requested", color: "#f97316" },
  { value: "03_approved",    label: "Approved",             color: "#22c55e" },
  { value: "04_waiting_normal", label: "Waiting",           color: "#8b5cf6" },
  { value: "1_done",         label: "Done",                 color: "#3b82f6" },
  { value: "1_canceled",     label: "Cancelled",            color: "#ef4444" },
];
```

---

## Part 2 — Timesheet Reporting (`account.analytic.line`)

### 2.1 What It Is

Timesheet reporting is aggregation over logged hours. In Antigravity it powers:

- "How many hours has each employee logged this month?"
- "What % of logged hours are billable?"
- "Which project consumed the most time?"
- "Leaderboard: billable hours ranking per employee"

> ⚠️ Always filter by `project_id != False` or `task_id != False` when querying `account.analytic.line`. Without a filter you will pull every accounting line in the Odoo instance — purchase orders, journal entries, everything.

### 2.2 Groupable Fields (from CSV, `store=True`)

| Odoo Field | Label | Type | Typical Group-By Use |
|---|---|---|---|
| `project_id` | Project | many2one | "Hours per project" |
| `task_id` | Task | many2one | "Hours per task" |
| `employee_id` | Employee | many2one | "Hours per employee" (leaderboard) |
| `user_id` | User | many2one | "Hours per system user" |
| `date` | Date | date | Group by week/month: `date:month` |
| `department_id` | Department | many2one | "Hours per department" |
| `timesheet_invoice_type` | Billable Type | selection | "Billable vs non-billable split" |
| `partner_id` | Partner | many2one | "Hours per customer" |
| `so_line` | Sales Order Item | many2one | "Hours per SO line" |
| `parent_task_id` | Parent Task | many2one | "Hours on subtasks" |

### 2.3 `timesheet_invoice_type` Values

| Value | Meaning |
|---|---|
| `billable_time` | Billable — invoiced by time logged |
| `billable_fixed` | Billable — fixed price (hours logged but fixed invoice) |
| `billable_milestones` | Billable — milestone-based invoicing |
| `non_billable` | Not billable — internal |
| `non_billable_project` | Not billable — project is internal |

### 2.4 Aggregatable Fields

| Odoo Field | Label | Type | Aggregate Use |
|---|---|---|---|
| `unit_amount` | Quantity (hours) | float | sum — total hours |
| `amount` | Amount (cost) | monetary | sum — total cost |

### 2.5 `read_group` Calls

**Hours per employee this month (leaderboard data)**

```python
from datetime import date

first_of_month = date.today().replace(day=1).strftime("%Y-%m-%d")

odoo_call("account.analytic.line", "read_group",
    [[
        ["project_id", "!=", False],
        ["date", ">=", first_of_month],
    ]],
    ["employee_id", "unit_amount:sum"],
    ["employee_id"],
    {"orderby": "unit_amount desc", "limit": 20}
)
# Returns: [{"employee_id": [id, name], "unit_amount": 42.5}, ...]
```

**Billable hours only (leaderboard — billable mode)**

```python
odoo_call("account.analytic.line", "read_group",
    [[
        ["project_id", "!=", False],
        ["timesheet_invoice_type", "not in", ["non_billable", "non_billable_project"]],
        ["date", ">=", first_of_month],
    ]],
    ["employee_id", "unit_amount:sum"],
    ["employee_id"],
    {"orderby": "unit_amount desc", "limit": 20}
)
```

**Hours per project (portfolio summary)**

```python
odoo_call("account.analytic.line", "read_group",
    [[["project_id", "!=", False]]],
    ["project_id", "unit_amount:sum", "amount:sum"],
    ["project_id"],
    {"orderby": "unit_amount desc"}
)
```

**Hours breakdown by day for a specific project (weekly grid)**

```python
odoo_call("account.analytic.line", "read_group",
    [[["project_id", "=", project_id]]],
    ["date", "unit_amount:sum"],
    ["date:day"],
    {"orderby": "date asc"}
)
```

**Billable vs non-billable split for a project**

```python
odoo_call("account.analytic.line", "read_group",
    [[["project_id", "=", project_id]]],
    ["timesheet_invoice_type", "unit_amount:sum"],
    ["timesheet_invoice_type"],
)
```

**Unvalidated timesheets pending approval**

```python
odoo_call("account.analytic.line", "search_read",
    [[
        ["project_id", "=", project_id],
        ["validated", "=", False],
    ]],
    {"fields": ["id", "name", "date", "employee_id", "unit_amount", "task_id"],
     "order": "date desc"}
)
```

### 2.6 DRF Endpoints

```python
# GET /api/reporting/timesheets/leaderboard/?mode=billable&month=2026-03
# GET /api/reporting/timesheets/leaderboard/?mode=total&month=2026-03
# GET /api/reporting/timesheets/by-project/
# GET /api/reporting/timesheets/weekly/?project_id=42
# GET /api/reporting/timesheets/billability/?project_id=42

class TimesheetReportViewSet(ViewSet):

    @action(detail=False, methods=["get"], url_path="leaderboard")
    def leaderboard(self, request):
        mode = request.query_params.get("mode", "total")  # "billable" or "total"
        month = request.query_params.get("month")  # "2026-03"

        domain = [["project_id", "!=", False]]

        if month:
            year, m = month.split("-")
            domain.append(["date", ">=", f"{year}-{m}-01"])
            # compute end of month
            import calendar
            last_day = calendar.monthrange(int(year), int(m))[1]
            domain.append(["date", "<=", f"{year}-{m}-{last_day}"])

        if mode == "billable":
            domain.append([
                "timesheet_invoice_type", "not in",
                ["non_billable", "non_billable_project"]
            ])

        result = odoo_call("account.analytic.line", "read_group",
            [domain,
             ["employee_id", "unit_amount:sum"],
             ["employee_id"]],
            {"orderby": "unit_amount desc", "limit": 20}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="by-project")
    def by_project(self, request):
        result = odoo_call("account.analytic.line", "read_group",
            [[["project_id", "!=", False]],
             ["project_id", "unit_amount:sum", "amount:sum"],
             ["project_id"]],
            {"orderby": "unit_amount desc"}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="billability")
    def billability(self, request):
        project_id = int(request.query_params.get("project_id", 0))
        result = odoo_call("account.analytic.line", "read_group",
            [[["project_id", "=", project_id]],
             ["timesheet_invoice_type", "unit_amount:sum"],
             ["timesheet_invoice_type"]],
            {}
        )
        return Response(result)
```

### 2.7 React Components

```javascript
// src/pages/Reporting/TimesheetLeaderboard.jsx
// Props: mode = "billable" | "total"
// Fetches: GET /api/reporting/timesheets/leaderboard/?mode={mode}&month={currentMonth}
// Renders:
//   - Toggle button: Billable Hours / Total Hours
//   - Ranked list: rank, avatar, employee name, hours bar, hours count
//   - Target line on bar (from hr.employee.billing_time_target — fetch separately)
```

---

## Part 3 — Customer Ratings (`rating.rating`)

### 3.1 What It Is

When a task enters the "Feedback" stage, Odoo auto-emails the customer with three smiley options. The customer's choice is stored in `rating.rating`. Reporting shows all ratings across projects and employees.

### 3.2 Field Reference Table (all `store=True` fields from CSV)

| Odoo Field | Label | Type | Relation | readonly | Notes |
|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | Auto-assigned |
| `res_model` | Document Model | char | — | ✅ | Always `"project.task"` for task ratings |
| `res_id` | Document | many2one_reference | — | ❌ | The task id |
| `res_name` | Resource name | char | — | ✅ | Task name — computed |
| `partner_id` | Customer | many2one | `res.partner` | ❌ | Who submitted the rating |
| `rated_partner_id` | Rated Operator | many2one | `res.partner` | ❌ | The employee/user who handled the task |
| `rating` | Rating Value | float | — | ❌ | `10` = Satisfied · `5` = Neutral · `1` = Dissatisfied |
| `rating_text` | Rating | selection | — | ✅ | `great` · `okay` · `bad` (computed from `rating`) |
| `feedback` | Comment | text | — | ❌ | Customer's free-text comment |
| `consumed` | Filled Rating | boolean | — | ❌ | True = customer submitted (not just opened link) |
| `is_internal` | Visible Internally Only | boolean | — | ❌ | True = hide from portal |
| `create_date` | Submitted on | datetime | — | ❌ | When rating was submitted |
| `rated_on` | Rated On | datetime | — | ❌ | When the request was sent |
| `message_id` | Message | many2one | `mail.message` | ❌ | Chatter message that triggered rating |
| `parent_res_model` | Parent Document Model | char | — | ❌ | Parent model (for nested records) |
| `parent_res_id` | Parent Document | integer | — | ❌ | Parent record id |

### 3.3 `rating_text` Values

| Value | Meaning | `rating` float |
|---|---|---|
| `great` | Satisfied (happy smiley) | 10 |
| `okay` | Neutral | 5 |
| `bad` | Dissatisfied (sad smiley) | 1 |

> **Important**: `rating_text` is `readonly=True` (computed from `rating` float). Never try to write it — write `rating` instead if you ever need to set a rating programmatically.

### 3.4 Field Set for Ratings Report

```python
# apps/reporting/constants.py

RATING_REPORT_FIELDS = [
    "id",
    "res_model",
    "res_id",
    "res_name",
    "partner_id",
    "rated_partner_id",
    "rating",
    "rating_text",
    "feedback",
    "consumed",
    "create_date",
    "rated_on",
]
```

### 3.5 `search_read` Calls

**All task ratings (Customer Ratings report page)**

```python
odoo_call("rating.rating", "search_read",
    [[
        ["res_model", "=", "project.task"],
        ["consumed", "=", True],    # only submitted ratings, not pending
    ]],
    {
        "fields": RATING_REPORT_FIELDS,
        "order": "create_date desc",
        "limit": 100,
    }
)
```

**Ratings for a specific project's tasks**

```python
# Get task IDs for the project first
task_ids = odoo_call("project.task", "search",
    [[["project_id", "=", project_id]]]
)

odoo_call("rating.rating", "search_read",
    [[
        ["res_model", "=", "project.task"],
        ["res_id", "in", task_ids],
        ["consumed", "=", True],
    ]],
    {"fields": RATING_REPORT_FIELDS, "order": "create_date desc"}
)
```

**Rating summary per operator (employee)**

```python
odoo_call("rating.rating", "read_group",
    [[
        ["res_model", "=", "project.task"],
        ["consumed", "=", True],
    ]],
    ["rated_partner_id", "rating:avg", "__count"],
    ["rated_partner_id"],
    {"orderby": "rating desc"}
)
# Returns: [{"rated_partner_id": [id, name], "rating": 8.5, "__count": 12}, ...]
```

**Rating distribution (great / okay / bad counts)**

```python
odoo_call("rating.rating", "read_group",
    [[
        ["res_model", "=", "project.task"],
        ["consumed", "=", True],
    ]],
    ["rating_text", "__count"],
    ["rating_text"],
)
# Returns: [{"rating_text": "great", "__count": 42}, ...]
```

### 3.6 DRF Endpoint

```python
# apps/reporting/views.py

class RatingReportViewSet(ViewSet):

    def list(self, request):
        """GET /api/reporting/ratings/ — full ratings report"""
        project_id = request.query_params.get("project_id")

        if project_id:
            task_ids = odoo_call("project.task", "search",
                [[["project_id", "=", int(project_id)]]]
            )
            domain = [
                ["res_model", "=", "project.task"],
                ["res_id", "in", task_ids],
                ["consumed", "=", True],
            ]
        else:
            domain = [
                ["res_model", "=", "project.task"],
                ["consumed", "=", True],
            ]

        ratings = odoo_call("rating.rating", "search_read",
            [domain],
            {"fields": RATING_REPORT_FIELDS, "order": "create_date desc", "limit": 200}
        )
        return Response(ratings)

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """GET /api/reporting/ratings/summary/ — per-operator averages"""
        result = odoo_call("rating.rating", "read_group",
            [[["res_model","=","project.task"],["consumed","=",True]],
             ["rated_partner_id", "rating:avg", "__count"],
             ["rated_partner_id"]],
            {"orderby": "rating desc"}
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="distribution")
    def distribution(self, request):
        """GET /api/reporting/ratings/distribution/ — great/okay/bad split"""
        result = odoo_call("rating.rating", "read_group",
            [[["res_model","=","project.task"],["consumed","=",True]],
             ["rating_text", "__count"],
             ["rating_text"]],
            {}
        )
        return Response(result)
```

### 3.7 React Component Map

```javascript
// src/pages/Reporting/CustomerRatings.jsx
// Sections:
//   1. Distribution bar: great (green) / okay (orange) / bad (red) counts
//   2. Table: task name, customer, rating smiley, operator, comment, date
//   3. Operator league table: ranked by avg rating + count

// src/utils/ratingHelpers.js
export const RATING_MAP = {
  great: { label: "Satisfied", emoji: "😊", color: "#22c55e", value: 10 },
  okay:  { label: "Neutral",   emoji: "😐", color: "#f97316", value: 5  },
  bad:   { label: "Dissatisfied", emoji: "😞", color: "#ef4444", value: 1 },
};

export const getRatingFromValue = (floatVal) => {
  if (floatVal >= 8) return RATING_MAP.great;
  if (floatVal >= 4) return RATING_MAP.okay;
  return RATING_MAP.bad;
};
```

---

## Part 4 — Burndown Chart (`project.task.burndown.chart.report`)

### 4.1 What It Is

A special Odoo read-only report model that shows task completion over time for a project — tasks opened vs closed per day. Not shown explicitly in the 18 videos but available in every Odoo Project instance.

### 4.2 Field Reference (all from CSV)

All fields are `readonly=True` — this is a virtual report model, never write to it.

| Odoo Field | Label | Type | Relation | Notes |
|---|---|---|---|---|
| `id` | ID | integer | — | Report record ID |
| `project_id` | Project | many2one | `project.project` | Filter target |
| `date` | Date | datetime | — | Date of snapshot |
| `stage_id` | Stage | many2one | `project.task.type` | Task's stage at that date |
| `state` | State | selection | — | Task state at that date |
| `is_closed` | Closing Stage | selection | — | `open` · `closed` |
| `milestone_id` | Milestone | many2one | `project.milestone` | |
| `partner_id` | Customer | many2one | `res.partner` | |
| `user_ids` | Assignees | many2many | `res.users` | |
| `tag_ids` | Tags | many2many | `project.tags` | |
| `allocated_hours` | Allocated Time | float | — | |
| `date_assign` | Assignment Date | datetime | — | |
| `date_deadline` | Deadline | date | — | |
| `date_last_stage_update` | Last Stage Update | date | — | |

### 4.3 Query

```python
# GET /api/reporting/burndown/?project_id=42
odoo_call("project.task.burndown.chart.report", "read_group",
    [[["project_id", "=", project_id]]],
    ["date", "is_closed", "__count"],
    ["date:day", "is_closed"],
    {"orderby": "date asc"}
)
# Returns: day-by-day split of open vs closed tasks
# Use to build a line chart: X=date, Y=count, two lines (open/closed)
```

---

## Appendix A — DRF URL Configuration for Reporting

```python
# apps/reporting/urls.py
from rest_framework.routers import DefaultRouter
from .views import TaskReportViewSet, TimesheetReportViewSet, RatingReportViewSet

router = DefaultRouter()
router.register(r"reporting/tasks",      TaskReportViewSet,      basename="report-tasks")
router.register(r"reporting/timesheets", TimesheetReportViewSet, basename="report-timesheets")
router.register(r"reporting/ratings",    RatingReportViewSet,    basename="report-ratings")

urlpatterns = router.urls
```

**Full endpoint list:**

```
GET  /api/reporting/tasks/by-stage/?project_id=42
GET  /api/reporting/tasks/by-status/?project_id=42
GET  /api/reporting/tasks/overdue/?project_id=42
GET  /api/reporting/tasks/hours-summary/

GET  /api/reporting/timesheets/leaderboard/?mode=billable&month=2026-03
GET  /api/reporting/timesheets/leaderboard/?mode=total&month=2026-03
GET  /api/reporting/timesheets/by-project/
GET  /api/reporting/timesheets/billability/?project_id=42

GET  /api/reporting/ratings/?project_id=42
GET  /api/reporting/ratings/summary/
GET  /api/reporting/ratings/distribution/
```

---

## Appendix B — `read_group` vs `search_read` Decision Rule

| Use `read_group` when… | Use `search_read` when… |
|---|---|
| You need counts, sums, or averages | You need individual records |
| You're building a chart or pivot | You're building a list or table |
| You're grouping by a field | You're filtering with a domain |
| You don't need task names or descriptions | You need full record detail |

**Never do this** (sum in Python after `search_read`):
```python
# ❌ WRONG — fetches 1000 records to sum 1 number
tasks = odoo_call("project.task", "search_read", [...], {"fields": ["unit_amount"]})
total = sum(t["unit_amount"] for t in tasks)

# ✅ CORRECT — Odoo sums in PostgreSQL, returns 1 record
result = odoo_call("account.analytic.line", "read_group",
    [domain, ["unit_amount:sum"], []], {}
)
total = result[0]["unit_amount"]
```

---

## Appendix C — Confirmed Bugs in `task.md` (fix before coding)

These three fields were cross-checked against the `edu-primesoft` CSV (26 Mar 2026) and are wrong in the uploaded `task.md`:

| Field | task.md says | CSV truth | Fix |
|---|---|---|---|
| `name` | `store=❌` | `store=True` | Change to `store=✅` |
| `state` | `readonly=✅` | `readonly=False` | Change to `readonly=❌` — you write `state` directly for all status dot changes |
| `display_in_project` | `store=❌` | `store=True` | Change to `store=✅` — it is safe to filter on this in `search_read` |

The `state` bug is the most critical. If your DRF serializer marks `state` as `read_only=True`, every status update (drag-drop to Done, Changes Requested, Approved) will silently drop the field and the task state will never change in Odoo.
