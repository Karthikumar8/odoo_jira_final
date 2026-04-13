# Skill: `account.analytic.line` — Timesheets (Antigravity)

**Odoo model**: `account.analytic.line`  
**CSV source**: `edu-primesoft` — 59 fields verified (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC  
**Prerequisite**: `allow_timesheets=True` must be set on `project.project`.

---

## 1. What `account.analytic.line` Is

This model is **not** a timesheet-only model. It is Odoo's general analytic accounting line — it records every cost and revenue entry against an analytic account. Timesheets are the subset of records where:

- `project_id` is set (links to a project)
- `task_id` is set (links to a task)
- `employee_id` is set (who logged the time)
- `unit_amount` is the hours logged (THE key field — always in hours, even if display is in days)

When you fetch timesheets, always filter by `project_id` or `task_id` — never fetch the full model unfiltered or you will get all accounting lines from the entire Odoo instance.

---

## 2. Field Reference Table

`store=True` = stored in PostgreSQL — safe in bulk `search_read`.  
`store=False` = computed — only fetch for single-record detail views.

### 2.1 Core Timesheet Fields

| Odoo Field | Label | Type | store | required | readonly | Notes |
|---|---|---|---|---|---|---|
| `id` | ID | integer | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Description | char | ✅ | ✅ | ❌ | What the person worked on — required, defaults to `/` |
| `date` | Date | date | ✅ | ✅ | ❌ | Date of work — required |
| `unit_amount` | Quantity | float | ✅ | ❌ | ❌ | **Hours logged** — THE most important field. Always in hours regardless of display UOM |
| `amount` | Amount | monetary | ✅ | ✅ | ❌ | Cost amount — auto-computed from `unit_amount × employee hourly cost` |
| `validated` | Validated Line | boolean | ✅ | ❌ | ❌ | True = approved by manager — locked from editing |
| `validated_status` | Validated Status | selection | ❌ | ✅ | ✅ | Computed: `draft` · `validated` |
| `x_timesheet_state` | Timesheet Status | selection | ✅ | ❌ | ❌ | Custom state field — `draft` · `validated` |
| `readonly_timesheet` | Readonly Timesheet | boolean | ❌ | ❌ | ✅ | Computed — True when validated or invoiced |

### 2.2 Project & Task Links

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `project_id` | Project | many2one | `project.project` | ✅ | Links timesheet to project |
| `task_id` | Task | many2one | `project.task` | ✅ | Links timesheet to task |
| `parent_task_id` | Parent Task | many2one | `project.task` | ✅ | ✅ Auto-set from task's parent — read-only |
| `account_id` | Project Account | many2one | `account.analytic.account` | ✅ | Analytic account — auto-set from `project_id.account_id` |
| `auto_account_id` | Analytic Account | many2one | `account.analytic.account` | ❌ | Computed alias |
| `analytic_distribution` | Analytic Distribution | json | ❌ | Distribution across multiple analytic accounts |

### 2.3 People

| Odoo Field | Label | Type | Relation | store | readonly | Notes |
|---|---|---|---|---|---|---|
| `employee_id` | Employee | many2one | `hr.employee` | ✅ | ❌ | Who logged the time — drives `amount` calculation |
| `user_id` | User | many2one | `res.users` | ✅ | ❌ | System user — auto-set from `employee_id` |
| `partner_id` | Partner | many2one | `res.partner` | ✅ | ❌ | Contact — auto-set from employee |
| `manager_id` | Manager | many2one | `hr.employee` | ✅ | ✅ | Auto-set from employee's manager |
| `department_id` | Department | many2one | `hr.department` | ✅ | ✅ | Auto-set from employee's department |
| `job_title` | Job Title | char | ❌ | ✅ | Computed from employee |
| `commercial_partner_id` | Commercial Partner | many2one | `res.partner` | ❌ | ✅ | Computed |

### 2.4 Sales & Billing

| Odoo Field | Label | Type | Relation | store | readonly | Notes |
|---|---|---|---|---|---|---|
| `so_line` | Sales Order Item | many2one | `sale.order.line` | ✅ | ❌ | Which SO line this timesheet invoices against |
| `order_id` | Order Reference | many2one | `sale.order` | ✅ | ✅ | Auto-set from `so_line` |
| `timesheet_invoice_id` | Invoice | many2one | `account.move` | ✅ | ✅ | Set when timesheet has been invoiced |
| `timesheet_invoice_type` | Billable Type | selection | ✅ | ❌ | `billable_time` · `billable_fixed` · `billable_milestones` · `non_billable` · `non_billable_project` |
| `allow_billable` | Billable | boolean | ❌ | ✅ | Computed from project |
| `is_so_line_edited` | SO Item Manually Edited | boolean | ✅ | ❌ | True if user manually changed `so_line` |
| `sale_order_state` | Status | selection | ❌ | ✅ | Computed SO state |
| `milestone_id` | Milestone | many2one | `project.milestone` | ❌ | ✅ | Computed — milestone linked via task |
| `user_can_validate` | User Can Validate | boolean | ❌ | ✅ | Computed permission |

### 2.5 Timer

| Odoo Field | Label | Type | store | readonly | Notes |
|---|---|---|---|---|---|
| `timer_start` | Timer Start | datetime | ❌ | ✅ | Set when timer running |
| `timer_pause` | Timer Last Pause | datetime | ❌ | ✅ | Set when paused |
| `is_timer_running` | Is Timer Running | boolean | ❌ | ✅ | Computed for current user |
| `display_timer` | Display Timer | boolean | ❌ | ✅ | Show timer widget? |
| `user_timer_id` | User Timer | one2many → `timer.timer` | ❌ | ✅ | Computed |

### 2.6 Accounting (Non-timesheet fields — ignore in project context)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `general_account_id` | Financial Account | many2one | `account.account` | ✅ | Auto-set — don't write manually |
| `journal_id` | Financial Journal | many2one | `account.journal` | ✅ | ✅ Auto-set — don't write manually |
| `move_line_id` | Journal Item | many2one | `account.move.line` | ✅ | Set when linked to an accounting entry |
| `currency_id` | Currency | many2one | `res.currency` | ✅ | ✅ Auto-set from company |
| `company_id` | Company | many2one | `res.company` | ✅ | ✅ Auto-set |
| `category` | Category | selection | ✅ | ❌ | `project` · `other` |
| `ref` | Ref. | char | ✅ | ❌ | Reference number |
| `code` | Code | char | ✅ | ❌ | Internal code |
| `product_id` | Product | many2one | `product.product` | ✅ | ❌ | Timesheet product |
| `product_uom_id` | Unit | many2one | `uom.uom` | ✅ | ❌ | Unit of measure |
| `encoding_uom_id` | Encoding UOM | many2one | `uom.uom` | ❌ | ✅ | Computed display UOM (hours or days) |
| `analytic_precision` | Analytic Precision | integer | ❌ | ❌ | Decimal precision |
| `fiscal_year_search` | Fiscal Year Search | boolean | ❌ | ❌ | Filter helper |

### 2.7 Time Off (HR — ignore in project context)

| Odoo Field | Notes |
|---|---|
| `holiday_id` → `hr.leave` | Set when line is auto-created by time off request |
| `global_leave_id` → `resource.calendar.leaves` | Set for public holidays |
| `is_hatched` | Computed — visual hatching for time off lines |

### 2.8 System Fields

| Odoo Field | Label | Type | store | readonly |
|---|---|---|---|---|
| `create_date` | Created on | datetime | ✅ | ✅ |
| `write_date` | Last Updated on | datetime | ✅ | ✅ |
| `create_uid` | Created by | many2one → `res.users` | ✅ | ✅ |
| `write_uid` | Last Updated by | many2one → `res.users` | ✅ | ✅ |
| `display_name` | Display Name | char | ❌ | ✅ |
| `calendar_display_name` | Calendar Display Name | char | ❌ | ✅ |
| `message_partner_ids` | Message Partner | many2many → `res.partner` | ❌ | ✅ |

---

## 3. Field Sets for Odoo API Calls

```python
# apps/timesheets/constants.py

TIMESHEET_LIST_FIELDS = [
    "id",
    "name",                 # Description
    "date",
    "unit_amount",          # Hours — THE key field
    "amount",               # Cost (monetary)
    "project_id",
    "task_id",
    "employee_id",
    "user_id",
    "so_line",              # Billing SO line
    "timesheet_invoice_id", # Invoiced? (set = yes)
    "timesheet_invoice_type",
    "validated",
    "x_timesheet_state",
    "is_so_line_edited",
    "account_id",
    "parent_task_id",
]
# All store=True — safe in bulk search_read.

TIMESHEET_DETAIL_FIELDS = TIMESHEET_LIST_FIELDS + [
    "partner_id",
    "manager_id",
    "department_id",
    "milestone_id",
    "order_id",
    "sale_order_state",
    "allow_billable",
    "readonly_timesheet",
    "user_can_validate",
    "validated_status",
    "timer_start",
    "timer_pause",
    "is_timer_running",
    "product_id",
    "product_uom_id",
    "currency_id",
    "company_id",
    "write_date",
    "create_uid",
]
```

---

## 4. Django DRF Implementation

### 4.1 Serializer

```python
# apps/timesheets/serializers.py
from rest_framework import serializers


BILLABLE_TYPE_CHOICES = [
    "billable_time",
    "billable_fixed",
    "billable_milestones",
    "non_billable",
    "non_billable_project",
]


class TimesheetSerializer(serializers.Serializer):
    # Core — all required on create
    name            = serializers.CharField(
        max_length=255, default="/",
        help_text="Description of work done. Defaults to '/' if blank."
    )
    date            = serializers.DateField()
    unit_amount     = serializers.FloatField(
        min_value=0.0,
        help_text="Hours logged. Always in hours — even if project displays in days."
    )

    # Links — project_id required, task_id optional
    project_id      = serializers.IntegerField()
    task_id         = serializers.IntegerField(required=False, allow_null=True)
    employee_id     = serializers.IntegerField(required=False, allow_null=True)

    # Billing
    so_line         = serializers.IntegerField(required=False, allow_null=True)
    is_so_line_edited = serializers.BooleanField(required=False, default=False)

    # Validation
    validated       = serializers.BooleanField(required=False, default=False)
    x_timesheet_state = serializers.ChoiceField(
        choices=["draft", "validated"],
        required=False,
        default="draft"
    )

    def validate_unit_amount(self, value):
        """Odoo minimum is 0. Values are stored in hours."""
        if value < 0:
            raise serializers.ValidationError("unit_amount cannot be negative.")
        return value

    def validate(self, data):
        """
        If validated=True, the line becomes read-only in Odoo.
        Once validated, only a manager can edit — warn the user.
        """
        return data
```

### 4.2 ViewSet

```python
# apps/timesheets/views.py
from datetime import date, timedelta
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import TimesheetSerializer
from .constants import TIMESHEET_LIST_FIELDS, TIMESHEET_DETAIL_FIELDS


class TimesheetViewSet(ViewSet):

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/timesheets/
        Query params:
          ?project_id=<id>          filter by project (recommended)
          ?task_id=<id>             filter by task
          ?employee_id=<id>         filter by employee
          ?date_from=YYYY-MM-DD     date range start
          ?date_to=YYYY-MM-DD       date range end
          ?validated=true|false     filter by validation status
          ?invoiced=true|false      filter by invoice status
          ?week=true                shortcut: current ISO week
          ?order=date desc          default ordering

        ALWAYS filter by project_id or task_id.
        Never fetch account.analytic.line without a domain — it returns
        ALL analytic lines from accounting, not just timesheets.
        """
        params = request.query_params
        domain = [["project_id", "!=", False]]  # timesheets only — never remove this

        if params.get("project_id"):
            domain.append(["project_id", "=", int(params["project_id"])])

        if params.get("task_id"):
            domain.append(["task_id", "=", int(params["task_id"])])

        if params.get("employee_id"):
            domain.append(["employee_id", "=", int(params["employee_id"])])

        if params.get("date_from"):
            domain.append(["date", ">=", params["date_from"]])

        if params.get("date_to"):
            domain.append(["date", "<=", params["date_to"]])

        if params.get("validated") == "true":
            domain.append(["validated", "=", True])
        elif params.get("validated") == "false":
            domain.append(["validated", "=", False])

        if params.get("invoiced") == "true":
            domain.append(["timesheet_invoice_id", "!=", False])
        elif params.get("invoiced") == "false":
            domain.append(["timesheet_invoice_id", "=", False])

        # Shortcut: current ISO week
        if params.get("week") == "true":
            today = date.today()
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=6)
            domain.append(["date", ">=", week_start.isoformat()])
            domain.append(["date", "<=", week_end.isoformat()])

        order = params.get("order", "date desc")

        timesheets = odoo_call(
            "account.analytic.line", "search_read",
            [domain],
            {"fields": TIMESHEET_LIST_FIELDS, "order": order}
        )
        return Response(timesheets)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/timesheets/{id}/"""
        result = odoo_call(
            "account.analytic.line", "read",
            [[int(pk)]],
            {"fields": TIMESHEET_DETAIL_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """
        POST /api/timesheets/
        Body: {
          "name": "Backend API setup",
          "date": "2026-04-01",
          "unit_amount": 2.5,
          "project_id": 5,
          "task_id": 42,
          "employee_id": 3
        }
        Odoo auto-sets: account_id, amount, currency_id, company_id,
        journal_id, general_account_id from project and employee.
        Never set these manually.
        """
        serializer = TimesheetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_id = odoo_call(
            "account.analytic.line", "create",
            [serializer.validated_data]
        )
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """
        PATCH /api/timesheets/{id}/
        Cannot update validated=True lines — Odoo raises AccessError.
        Check readonly_timesheet before allowing edits in React.
        """
        serializer = TimesheetSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        try:
            odoo_call(
                "account.analytic.line", "write",
                [[int(pk)], serializer.validated_data]
            )
        except Exception as e:
            if "validated" in str(e).lower() or "access" in str(e).lower():
                return Response(
                    {"detail": "This timesheet line is validated and cannot be edited."},
                    status=status.HTTP_403_FORBIDDEN
                )
            raise
        return Response({"id": int(pk)})

    # ── Delete ────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/timesheets/{id}/
        Validated or invoiced lines cannot be deleted.
        """
        try:
            odoo_call("account.analytic.line", "unlink", [[int(pk)]])
        except Exception as e:
            if "validated" in str(e).lower() or "invoiced" in str(e).lower():
                return Response(
                    {"detail": "Cannot delete a validated or invoiced timesheet line."},
                    status=status.HTTP_403_FORBIDDEN
                )
            raise
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Custom Actions ────────────────────────────────────────────

    @action(detail=False, methods=["get"], url_path="summary")
    def summary(self, request):
        """
        GET /api/timesheets/summary/?project_id=<id>
        Returns total hours per task — used in project dashboard.
        Uses search_read with groupby via Odoo read_group.
        """
        project_id = request.query_params.get("project_id")
        if not project_id:
            return Response({"detail": "project_id required"}, status=400)

        result = odoo_call(
            "account.analytic.line", "read_group",
            [[["project_id", "=", int(project_id)], ["project_id", "!=", False]]],
            {
                "fields": ["task_id", "unit_amount:sum", "amount:sum"],
                "groupby": ["task_id"],
            }
        )
        return Response(result)

    @action(detail=False, methods=["get"], url_path="weekly")
    def weekly(self, request):
        """
        GET /api/timesheets/weekly/?employee_id=<id>&date_from=YYYY-MM-DD
        Returns timesheet lines grouped by day for the weekly grid view.
        """
        params = request.query_params
        employee_id = params.get("employee_id")
        date_from = params.get("date_from")

        if not employee_id or not date_from:
            return Response(
                {"detail": "employee_id and date_from required"}, status=400
            )

        date_from_obj = date.fromisoformat(date_from)
        date_to_obj = date_from_obj + timedelta(days=6)

        domain = [
            ["project_id", "!=", False],
            ["employee_id", "=", int(employee_id)],
            ["date", ">=", date_from_obj.isoformat()],
            ["date", "<=", date_to_obj.isoformat()],
        ]

        timesheets = odoo_call(
            "account.analytic.line", "search_read",
            [domain],
            {"fields": TIMESHEET_LIST_FIELDS, "order": "date asc"}
        )
        return Response(timesheets)

    @action(detail=True, methods=["patch"], url_path="validate")
    def validate(self, request, pk=None):
        """
        PATCH /api/timesheets/{id}/validate/
        Marks a single timesheet line as validated.
        Only users with timesheet validation rights can do this.
        """
        try:
            odoo_call(
                "account.analytic.line", "write",
                [[int(pk)], {"validated": True, "x_timesheet_state": "validated"}]
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"id": int(pk), "validated": True})

    @action(detail=False, methods=["post"], url_path="validate-bulk")
    def validate_bulk(self, request):
        """
        POST /api/timesheets/validate-bulk/
        Body: { "ids": [1, 2, 3], "project_id": 5 }
        Validates multiple lines at once — used by manager approval workflow.
        """
        ids = request.data.get("ids", [])
        if not ids:
            return Response({"detail": "ids required"}, status=400)
        try:
            odoo_call(
                "account.analytic.line", "write",
                [ids, {"validated": True, "x_timesheet_state": "validated"}]
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_403_FORBIDDEN)
        return Response({"validated": len(ids), "ids": ids})
```

### 4.3 URL Configuration

```python
# apps/timesheets/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TimesheetViewSet

router = DefaultRouter()
router.register(r"timesheets", TimesheetViewSet, basename="timesheet")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/timesheets/?project_id={id}
# GET    /api/timesheets/?task_id={id}
# GET    /api/timesheets/?project_id={id}&validated=false
# GET    /api/timesheets/?week=true&employee_id={id}
# POST   /api/timesheets/
# GET    /api/timesheets/{id}/
# PATCH  /api/timesheets/{id}/
# DELETE /api/timesheets/{id}/
# GET    /api/timesheets/summary/?project_id={id}
# GET    /api/timesheets/weekly/?employee_id={id}&date_from=YYYY-MM-DD
# PATCH  /api/timesheets/{id}/validate/
# POST   /api/timesheets/validate-bulk/
```

---

## 5. React API Layer

```javascript
// src/api/timesheets.js
import client from "./client";

// ── List ──────────────────────────────────────────────────────────
export const getTimesheets = (params = {}) =>
  client.get("/timesheets/", { params }).then((r) => r.data);
// params: { project_id, task_id, employee_id, date_from, date_to,
//           validated, invoiced, week, order }

// ── Weekly grid ───────────────────────────────────────────────────
export const getWeeklyTimesheets = (employeeId, dateFrom) =>
  client
    .get("/timesheets/weekly/", { params: { employee_id: employeeId, date_from: dateFrom } })
    .then((r) => r.data);

// ── Summary (hours per task) ──────────────────────────────────────
export const getTimesheetSummary = (projectId) =>
  client
    .get("/timesheets/summary/", { params: { project_id: projectId } })
    .then((r) => r.data);

// ── Detail ────────────────────────────────────────────────────────
export const getTimesheet = (id) =>
  client.get(`/timesheets/${id}/`).then((r) => r.data);

// ── Create ────────────────────────────────────────────────────────
export const createTimesheet = (data) =>
  client.post("/timesheets/", data).then((r) => r.data);
// data: { name, date, unit_amount, project_id, task_id, employee_id }

// ── Update ────────────────────────────────────────────────────────
export const updateTimesheet = (id, data) =>
  client.patch(`/timesheets/${id}/`, data).then((r) => r.data);

// ── Delete ────────────────────────────────────────────────────────
export const deleteTimesheet = (id) =>
  client.delete(`/timesheets/${id}/`).then((r) => r.data);

// ── Validate ──────────────────────────────────────────────────────
export const validateTimesheet = (id) =>
  client.patch(`/timesheets/${id}/validate/`).then((r) => r.data);

export const validateTimesheetsBulk = (ids) =>
  client.post("/timesheets/validate-bulk/", { ids }).then((r) => r.data);
```

---

## 6. React Query Hooks

```javascript
// src/hooks/useTimesheets.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/timesheets";

// ── List ──────────────────────────────────────────────────────────
export const useTimesheets = (params = {}) =>
  useQuery({
    queryKey: ["timesheets", params],
    queryFn: () => api.getTimesheets(params),
    enabled: !!(params.project_id || params.task_id),
    staleTime: 15_000, // Timesheets change frequently — short cache
  });

// ── Weekly grid ───────────────────────────────────────────────────
export const useWeeklyTimesheets = (employeeId, dateFrom) =>
  useQuery({
    queryKey: ["timesheets", "weekly", employeeId, dateFrom],
    queryFn: () => api.getWeeklyTimesheets(employeeId, dateFrom),
    enabled: !!employeeId && !!dateFrom,
    staleTime: 15_000,
  });

// ── Summary ───────────────────────────────────────────────────────
export const useTimesheetSummary = (projectId) =>
  useQuery({
    queryKey: ["timesheets", "summary", projectId],
    queryFn: () => api.getTimesheetSummary(projectId),
    enabled: !!projectId,
    staleTime: 30_000,
  });

// ── Create ────────────────────────────────────────────────────────
export const useCreateTimesheet = (projectId, taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      // Task effective_hours and remaining_hours update on timesheet create
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      if (projectId)
        qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Update ────────────────────────────────────────────────────────
export const useUpdateTimesheet = (projectId, taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateTimesheet(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      if (projectId)
        qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Delete ────────────────────────────────────────────────────────
export const useDeleteTimesheet = (projectId, taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
      if (projectId)
        qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Validate (single) ─────────────────────────────────────────────
export const useValidateTimesheet = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.validateTimesheet,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      if (projectId)
        qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Validate bulk ─────────────────────────────────────────────────
export const useValidateTimesheetsBulk = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.validateTimesheetsBulk,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      if (projectId)
        qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};
```

---

## 7. Inline Timesheet Table (Task Form)

The timesheet tab inside a task form — the most common UI entry point.

```javascript
// src/components/TimesheetTab/TimesheetTab.jsx
import { useState } from "react";
import { useTimesheets } from "../../hooks/useTimesheets";
import { useCreateTimesheet, useDeleteTimesheet } from "../../hooks/useTimesheets";

export default function TimesheetTab({ projectId, taskId }) {
  const { data: timesheets = [], isLoading } = useTimesheets({ task_id: taskId });
  const createTs = useCreateTimesheet(projectId, taskId);
  const deleteTs = useDeleteTimesheet(projectId, taskId);

  const [newRow, setNewRow] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "/",
    unit_amount: 0,
  });

  const totalHours = timesheets.reduce((sum, t) => sum + t.unit_amount, 0);

  const handleAddRow = () => {
    if (newRow.unit_amount <= 0) return;
    createTs.mutate({
      ...newRow,
      project_id: projectId,
      task_id: taskId,
    });
    setNewRow({ date: new Date().toISOString().split("T")[0], name: "/", unit_amount: 0 });
  };

  if (isLoading) return <div className="p-4 text-gray-400">Loading timesheets…</div>;

  return (
    <div className="space-y-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Employee</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4 text-right">Hours</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {timesheets.map((ts) => (
            <tr key={ts.id} className="border-b hover:bg-gray-50">
              <td className="py-2 pr-4">{ts.date}</td>
              <td className="py-2 pr-4">
                {Array.isArray(ts.employee_id) ? ts.employee_id[1] : "—"}
              </td>
              <td className="py-2 pr-4 text-gray-600">{ts.name}</td>
              <td className="py-2 pr-4 text-right font-mono">
                {ts.unit_amount.toFixed(2)}h
              </td>
              <td className="py-2">
                {!ts.validated && (
                  <button
                    onClick={() => deleteTs.mutate(ts.id)}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                )}
                {ts.validated && (
                  <span className="text-xs text-green-600 font-medium">✓</span>
                )}
              </td>
            </tr>
          ))}

          {/* New row input */}
          <tr className="border-b bg-blue-50">
            <td className="py-2 pr-4">
              <input
                type="date"
                value={newRow.date}
                onChange={(e) => setNewRow({ ...newRow, date: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </td>
            <td className="py-2 pr-4 text-gray-400 text-sm">auto</td>
            <td className="py-2 pr-4">
              <input
                type="text"
                placeholder="Description"
                value={newRow.name}
                onChange={(e) => setNewRow({ ...newRow, name: e.target.value })}
                className="border rounded px-2 py-1 text-sm w-full"
              />
            </td>
            <td className="py-2 pr-4">
              <input
                type="number"
                step="0.25"
                min="0"
                placeholder="0.00"
                value={newRow.unit_amount || ""}
                onChange={(e) =>
                  setNewRow({ ...newRow, unit_amount: parseFloat(e.target.value) || 0 })
                }
                className="border rounded px-2 py-1 text-sm w-20 text-right font-mono"
              />
            </td>
            <td className="py-2">
              <button
                onClick={handleAddRow}
                disabled={createTs.isPending}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                + Add
              </button>
            </td>
          </tr>
        </tbody>

        {/* Total row */}
        <tfoot>
          <tr>
            <td colSpan={3} className="py-2 text-right text-sm text-gray-500 font-medium">
              Total
            </td>
            <td className="py-2 pr-4 text-right font-mono font-semibold">
              {totalHours.toFixed(2)}h
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
```

---

## 8. `timesheet_invoice_type` Reference

This field tells you why a timesheet line is (or isn't) billable.

| Odoo Value | Label | Meaning |
|---|---|---|
| `billable_time` | Billable Time | Billed by logged hours (timesheet billing) |
| `billable_fixed` | Billable Fixed | Part of a fixed-price SO — hours logged but not billed per hour |
| `billable_milestones` | Billable Milestones | Part of a milestone-based SO |
| `non_billable` | Non Billable | Task explicitly marked non-billable |
| `non_billable_project` | Non Billable Project | Project is not billable |

```javascript
// src/utils/timesheetBillable.js
export const BILLABLE_TYPE_MAP = {
  billable_time:        { label: "Billable",          color: "#22c55e" },
  billable_fixed:       { label: "Fixed Price",        color: "#3b82f6" },
  billable_milestones:  { label: "Milestones",         color: "#8b5cf6" },
  non_billable:         { label: "Non Billable",       color: "#9ca3af" },
  non_billable_project: { label: "Non Billable (Proj)",color: "#d1d5db" },
};
```

---

## 9. Domain Filter Reference

```python
# ALWAYS start with this — never fetch without project_id filter
[["project_id", "!=", False]]

# All timesheets for a project
[["project_id", "=", project_id]]

# All timesheets for a specific task
[["task_id", "=", task_id]]

# Unvalidated timesheets for a project (pending approval)
[["project_id", "=", project_id], ["validated", "=", False]]

# Validated timesheets only
[["project_id", "=", project_id], ["validated", "=", True]]

# Uninvoiced billable timesheets (ready to invoice)
[
    ["project_id", "=", project_id],
    ["timesheet_invoice_id", "=", False],
    ["timesheet_invoice_type", "in", ["billable_time"]],
]

# Timesheets for a date range
[
    ["project_id", "=", project_id],
    ["date", ">=", "2026-04-01"],
    ["date", "<=", "2026-04-30"],
]

# Timesheets by a specific employee this week
[
    ["project_id", "!=", False],
    ["employee_id", "=", employee_id],
    ["date", ">=", week_start],
    ["date", "<=", week_end],
]

# Group by task to get hours per task (use read_group not search_read)
# fields=["task_id", "unit_amount:sum"], groupby=["task_id"]
```

---

## 10. Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| Never fetch without a domain | `search_read` on `account.analytic.line` with `[]` domain returns ALL analytic lines — payroll, expenses, purchases — not just timesheets | Always start domain with `[["project_id", "!=", False]]` at minimum |
| `unit_amount` is always hours | Even when the project displays timesheets in days, `unit_amount` stores and receives hours. A day = 8 hours by default but this is configurable per employee | Convert for display only — always write hours to `unit_amount` |
| `amount` is auto-computed — never write it | Odoo calculates `amount = unit_amount × employee.hourly_cost`. Writing it manually is overridden on save | Only write `unit_amount`. Let Odoo compute `amount` |
| `validated=True` locks the line | Once validated, the line is read-only. `write()` and `unlink()` raise `AccessError` | Always check `readonly_timesheet` before showing edit/delete buttons in React |
| `name` defaults to `/` — not blank | Odoo requires `name` on `account.analytic.line`. If user leaves description empty, send `"/"` not `""` | The serializer defaults `name` to `"/"` — never send an empty string |
| `employee_id` vs `user_id` | These are different records. `employee_id` links to `hr.employee`. `user_id` links to `res.users`. The cost is calculated from `employee_id.hourly_cost`, not from the user | Always set `employee_id` when creating a timesheet — `user_id` alone is not enough for cost calculation |
| `so_line` is not the same as `project.task.sale_line_id` | A task has `sale_line_id` (the SO line for the task). A timesheet has `so_line` (the SO line for this specific timesheet entry). They are usually the same but can differ if the user manually edits | When creating a timesheet for a task that has `sale_line_id`, pass that ID as `so_line` |
| `read_group` for summaries — not `search_read` | To get total hours per task, use `read_group` with `groupby: ["task_id"]` and `fields: ["unit_amount:sum"]`. Using `search_read` and summing in Python is much slower | The `/summary/` endpoint uses `read_group` correctly |
| Invalidate tasks after timesheet write | `effective_hours`, `remaining_hours`, and `progress` on `project.task` are computed from timesheets. They don't auto-update in React — you must invalidate the task query after any timesheet CRUD | All `useCreateTimesheet`, `useUpdateTimesheet`, `useDeleteTimesheet` hooks invalidate both `["timesheets"]` and `["tasks", taskId]` |
