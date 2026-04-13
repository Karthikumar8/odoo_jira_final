# Skill: `project.project` — Antigravity

**Odoo model**: `project.project`  
**CSV source**: `edu-primesoft` — 150 fields verified (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC  
**Rule**: Every field name below is the exact Odoo API name. Use it verbatim in `search_read`, `create`, and `write` calls.

---

## 1. Field Reference Table

Fields are grouped by purpose. `store=True` = Odoo writes this to PostgreSQL (safe to request in `search_read`). `store=False` = computed on-the-fly — never request these in bulk list calls; only fetch individually when needed.

### 1.1 Identity & Core

| Odoo Field | Label | Type | Relation | store | required | readonly | Notes |
|---|---|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | ✅ | ✅ | Auto-assigned by Odoo |
| `name` | Name | char | — | ✅ | ✅ | ❌ | Project title — required on create |
| `active` | Active | boolean | — | ✅ | ❌ | ❌ | False = archived |
| `color` | Color Index | integer | — | ✅ | ❌ | ❌ | 0–11 color palette index |
| `sequence` | Sequence | integer | — | ✅ | ❌ | ❌ | Kanban card order |
| `is_template` | Is Template | boolean | — | ✅ | ❌ | ❌ | True = project template (used by Sales) |
| `is_fsm` | Field Service | boolean | — | ✅ | ❌ | ❌ | True = Field Service module project |
| `label_tasks` | Use Tasks as | char | — | ✅ | ❌ | ❌ | Rename "Tasks" label (e.g. "Tickets") |
| `description` | Description | html | — | ✅ | ❌ | ❌ | Rich text project description |
| `create_date` | Created on | datetime | — | ✅ | ❌ | ✅ | Read-only system field |
| `write_date` | Last Updated on | datetime | — | ✅ | ❌ | ✅ | Read-only system field |

### 1.2 Dates & Timeline

| Odoo Field | Label | Type | store | required | readonly | Notes |
|---|---|---|---|---|---|---|
| `date_start` | Start Date | date | ✅ | ❌ | ❌ | Planned project start |
| `date` | Expiration Date | date | ✅ | ❌ | ❌ | Project deadline (called "date" in API — not "deadline") |

### 1.3 Relationships (People & Companies)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `user_id` | Project Manager | many2one | `res.users` | ✅ | Returns `[id, display_name]` |
| `partner_id` | Customer | many2one | `res.partner` | ✅ | Linked customer / portal user |
| `company_id` | Company | many2one | `res.company` | ✅ | Auto-set from current company |
| `favorite_user_ids` | Members | many2many | `res.users` | ✅ | Users who starred/pinned project |
| `collaborator_ids` | Collaborators | one2many | `project.collaborator` | ✅ | Portal collaborators |
| `create_uid` | Created by | many2one | `res.users` | ✅ | Read-only |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | Read-only |

### 1.4 Visibility & Privacy

| Odoo Field | Label | Type | store | required | Selection Values | Notes |
|---|---|---|---|---|---|---|
| `privacy_visibility` | Visibility | selection | ✅ | ✅ | `followers` · `employees` · `portal` | `followers` = Invited users only · `employees` = All internal users · `portal` = Public portal |
| `access_token` | Security Token | char | ✅ | ❌ | — | Portal share token — never expose in list API |
| `access_url` | Portal Access URL | char | ❌ | ❌ | — | Computed; fetch only when sharing portal link |

### 1.5 Feature Toggles (Boolean switches)

These map directly to the checkboxes in Odoo Project Settings tab. All are `store=True`.

| Odoo Field | Label | store | Default | What it enables |
|---|---|---|---|---|
| `allow_timesheets` | Timesheets | ✅ | False | Timesheet tab + timer on tasks |
| `allow_milestones` | Milestones | ✅ | False | Milestones tab + milestone_id on tasks |
| `allow_recurring_tasks` | Recurring Tasks | ✅ | False | Recurrent toggle on task form |
| `allow_task_dependencies` | Task Dependencies | ✅ | False | Blocked By / Blocks tabs on tasks + Gantt arrows |
| `allow_billable` | Billable | ✅ | False | Billing/invoicing fields visible |
| `allow_material` | Products on Tasks | ✅ | False | Products tab on tasks |
| `allow_quotations` | Extra Quotations | ✅ | False | Extra Quotations tab |
| `allow_worksheets` | Worksheets | ✅ | False | Worksheet tab on tasks |
| `allow_geolocation` | Geolocation | ✅ | False | Maps/geolocation on tasks |
| `hide_price` | Hide Price | ✅ | False | Hides price on customer portal |

### 1.6 Billing & Invoicing

| Odoo Field | Label | Type | store | required | Selection Values | Notes |
|---|---|---|---|---|---|---|
| `allow_billable` | Billable | boolean | ✅ | ❌ | — | Master switch (see 1.5 above) |
| `billing_type` | Billing Type | selection | ✅ | ✅ | `task_rate` · `fixed_rate` · `employee_rate` | Only visible when `allow_billable=True` |
| `pricing_type` | Pricing | selection | ❌ | ❌ | — | Computed; do not request in bulk |
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | ✅ | ❌ | Links project to a specific SO line |
| `reinvoiced_sale_order_id` | Sales Order | many2one | `sale.order` | ✅ | ❌ | The parent sale order |
| `sale_order_id` | Order Reference | many2one | `sale.order` | ❌ | ❌ | Computed — fetch individually |
| `sale_line_employee_ids` | Sale line/Employee map | one2many | `project.sale.line.employee.map` | ✅ | ❌ | Per-employee billing rate map |

### 1.7 Hours & Time Tracking

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `allocated_hours` | Allocated Time | float | ✅ | Total planned hours for project |
| `effective_hours` | Time Spent | float | ❌ | Computed sum of all timesheets — fetch individually |
| `remaining_hours` | Time Remaining | float | ❌ | `allocated_hours - effective_hours` — computed |
| `total_timesheet_time` | Total Timesheet Time | float | ❌ | Rounded total in display UOM — computed |
| `encode_uom_in_days` | Encode in Days | boolean | ❌ | True = timesheets encoded in days not hours |
| `timesheet_encode_uom_id` | Timesheet Encode UOM | many2one | `uom.uom` | ❌ | Computed UOM reference |
| `timesheet_product_id` | Timesheet Product | many2one | `product.product` | ✅ | Product used for timesheet billing |
| `timesheet_ids` | Associated Timesheets | one2many | `account.analytic.line` | ✅ | All timesheets linked to project |

### 1.8 Stages & Status (Project-level, not Task-level)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `stage_id` | Stage | many2one | `project.project.stage` | ✅ | Global project stage (New / In Progress / Done etc.) — different from task stages |
| `stage_id_color` | Stage Color | integer | — | ❌ | Computed |
| `last_update_status` | Last Update Status | selection | — | ✅ | `on_track` · `at_risk` · `off_track` · `on_hold` — the colored status dot on project card |
| `last_update_id` | Last Update | many2one | `project.update` | ✅ | Most recent Project Update snapshot |
| `last_update_color` | Last Update Color | integer | — | ❌ | Computed color value |
| `is_rotting` | Rotting | boolean | — | ❌ | Computed — True if no activity for N days |
| `rotting_days` | Days Rotting | integer | — | ❌ | Computed |

### 1.9 Milestones

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `allow_milestones` | Milestones | boolean | — | ✅ | Toggle (see 1.5) |
| `milestone_ids` | Milestone | one2many | `project.milestone` | ✅ | All milestones in project |
| `milestone_count` | Milestone Count | integer | — | ❌ | Computed count |
| `milestone_count_reached` | Reached | integer | — | ❌ | Computed |
| `milestone_progress` | Milestones Reached | integer | — | ❌ | Computed % |
| `next_milestone_id` | Next Milestone | many2one | `project.milestone` | ❌ | Computed — nearest upcoming |
| `is_milestone_exceeded` | Milestone Exceeded | boolean | — | ❌ | Computed |
| `is_milestone_deadline_exceeded` | Deadline Exceeded | boolean | — | ❌ | Computed |
| `can_mark_milestone_as_done` | Can Mark Done | boolean | — | ❌ | Computed permission |

### 1.10 Tasks

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `task_ids` | Tasks | one2many | `project.task` | ✅ | All tasks (use `search_read` on project.task instead) |
| `tasks` | Task Activities | one2many | `project.task` | ✅ | Same but filtered by display_in_project |
| `type_ids` | Tasks Stages | many2many | `project.task.type` | ✅ | Kanban stages for this project |
| `task_count` | Task Count | integer | — | ❌ | Computed |
| `open_task_count` | Open Task Count | integer | — | ❌ | Computed |
| `closed_task_count` | Closed Task Count | integer | — | ❌ | Computed |
| `task_completion_percentage` | Task Completion % | float | — | ❌ | Computed |
| `task_properties_definition` | Task Properties | properties_definition | — | ✅ | Custom property schema for tasks |

### 1.11 Tags

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `tag_ids` | Tags | many2many | `project.tags` | ✅ | Project-level tags (color-coded) |

### 1.12 Analytics & Profitability

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `account_id` | Project Account | many2one | `account.analytic.account` | ✅ | Analytic account (auto-created with project) |
| `auto_account_id` | Analytic Account | many2one | `account.analytic.account` | ❌ | Computed — links to account_id |
| `analytic_account_active` | Active Account | boolean | — | ❌ | Computed |
| `analytic_account_balance` | Balance | monetary | — | ❌ | Computed — total analytic balance |
| `currency_id` | Currency | many2one | `res.currency` | ❌ | Computed from company |
| `is_project_overtime` | Project in Overtime | boolean | — | ❌ | Computed |
| `duration_tracking` | Status time | json | — | ❌ | Computed tracking JSON |

### 1.13 Email Alias

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `alias_id` | Alias | many2one → `mail.alias` | ✅ | Required — auto-created with project |
| `alias_name` | Alias Name | char | ❌ | The prefix (e.g. `walking` in `walking@yourdomain.com`) |
| `alias_email` | Email Alias | char | ❌ | Full email — computed; display only |
| `alias_full_name` | Alias Email | char | ❌ | Computed full alias |
| `alias_domain` | Alias Domain Name | char | ❌ | Computed |
| `alias_domain_id` | Alias Domain | many2one → `mail.alias.domain` | ❌ | |
| `alias_contact` | Alias Contact Security | selection | ❌ | `everyone` · `partners` · `followers` |
| `alias_defaults` | Default Values | text | ❌ | JSON defaults applied to tasks created via email |
| `alias_status` | Alias Status | selection | ❌ | `valid` · `invalid` · `not_created` |
| `alias_bounced_content` | Bounced Message | html | ❌ | Custom bounce reply |

### 1.14 Customer Ratings

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `rating_ids` | Ratings | one2many → `rating.rating` | ✅ | All customer rating records |
| `rating_count` | # Ratings | integer | ❌ | Computed |
| `rating_avg` | Average Rating | float | ❌ | Computed (1=bad 5=ok 10=good) |
| `rating_avg_percentage` | Average Rating (%) | float | ❌ | Computed |
| `rating_percentage_satisfaction` | Rating Satisfaction | integer | ❌ | Computed |
| `show_ratings` | Show Ratings | boolean | ❌ | Computed display flag |

### 1.15 Activities (Chatter)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `activity_ids` | Activities | one2many | `mail.activity` | ✅ | Scheduled activities on project |
| `activity_state` | Activity State | selection | — | ❌ | `overdue` · `today` · `planned` |
| `activity_date_deadline` | Next Activity Deadline | date | — | ❌ | Computed |
| `activity_summary` | Next Activity Summary | char | — | ❌ | |
| `activity_type_id` | Next Activity Type | many2one | `mail.activity.type` | ❌ | |
| `activity_user_id` | Responsible User | many2one | `res.users` | ❌ | |
| `activity_calendar_event_id` | Calendar Event | many2one | `calendar.event` | ❌ | |
| `activity_exception_decoration` | Exception Decoration | selection | — | ❌ | |
| `my_activity_date_deadline` | My Activity Deadline | date | — | ❌ | Current user's deadline |

### 1.16 Messages & Followers (Chatter)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `message_ids` | Messages | one2many | `mail.message` | ✅ | Chatter messages |
| `message_follower_ids` | Followers | one2many | `mail.followers` | ✅ | All followers |
| `message_partner_ids` | Followers (Partners) | many2many | `res.partner` | ❌ | Computed |
| `message_is_follower` | Is Follower | boolean | — | ❌ | Current user follows? |
| `message_needaction` | Action Needed | boolean | — | ❌ | Unread messages? |
| `message_needaction_counter` | # Actions | integer | — | ❌ | Count |
| `message_has_error` | Delivery Error | boolean | — | ❌ | |
| `message_attachment_count` | Attachment Count | integer | — | ❌ | |
| `has_message` | Has Message | boolean | — | ❌ | |
| `website_message_ids` | Website Messages | one2many | `mail.message` | ✅ | Portal/website messages |

### 1.17 Sales & Purchase Stats (Smart Buttons)

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `sale_order_count` | Sale Order Count | integer | ❌ | Smart button count |
| `sale_order_line_count` | Sale Order Line Count | integer | ❌ | |
| `sale_order_state` | Status | selection | ❌ | |
| `invoice_count` | Invoice Count | integer | ❌ | Smart button count |
| `purchase_orders_count` | # Purchase Orders | integer | ❌ | Smart button count |
| `vendor_bill_count` | Vendor Bill Count | integer | ❌ | Smart button count |
| `has_any_so_to_invoice` | Has SO to Invoice | boolean | ❌ | |
| `has_any_so_with_nothing_to_invoice` | Has SO - Nothing to Invoice | boolean | ❌ | |
| `display_sales_stat_buttons` | Display Sales Stat Buttons | boolean | ❌ | Show/hide smart buttons |

### 1.18 Documents & Assets

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `documents_folder_id` | Documents Folder | many2one | `documents.document` | ✅ | Auto-created folder |
| `document_ids` | Document | one2many | `documents.document` | ❌ | |
| `document_count` | Document Count | integer | ❌ | Smart button count |
| `assets_count` | # Assets | integer | ❌ | Smart button count |
| `bom_count` | Bom Count | integer | ❌ | Manufacturing BoM count |
| `contracts_count` | # Contracts | integer | ❌ | HR contract count |
| `production_count` | Production Count | integer | ❌ | Manufacturing orders |
| `update_count` | Update Count | integer | ❌ | # Project Update snapshots |
| `update_ids` | Update | one2many | `project.update` | ✅ | All Project Updates |
| `worksheet_template_id` | Worksheet Template | many2one | `worksheet.template` | ✅ | FSM worksheet |
| `resource_calendar_id` | Working Time | many2one | `resource.calendar` | ❌ | Computed working schedule |

### 1.19 Misc / Warnings

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `is_internal_project` | Is Internal Project | boolean | ❌ | Computed — linked to internal HR |
| `collaborator_count` | # Collaborators | integer | ❌ | |
| `warning_employee_rate` | Warning Employee Rate | boolean | ❌ | Billing rate missing warning |
| `is_favorite` | Show on Dashboard | boolean | ❌ | Current user's favorite flag |
| `privacy_visibility_warning` | Privacy Warning | char | ❌ | Computed warning message |
| `display_name` | Display Name | char | ❌ | Computed — use `name` instead |
| `access_warning` | Access Warning | text | ❌ | Computed |
| `access_instruction_message` | Access Instruction | char | ❌ | Computed |

---

## 2. Field Sets for Odoo API Calls

Use these exact lists in every `search_read` or `read` call. Never request computed (`store=False`) fields in bulk list calls — Odoo evaluates them one-by-one and it kills performance.

### 2.1 `PROJECT_LIST_FIELDS` — Kanban card (fast, stored only)

```python
# apps/projects/constants.py

PROJECT_LIST_FIELDS = [
    "id",
    "name",
    "active",
    "color",
    "sequence",
    "partner_id",           # Customer
    "user_id",              # Project Manager
    "date_start",
    "date",                 # Deadline / Expiration
    "privacy_visibility",
    "last_update_status",   # Status dot color
    "last_update_id",       # Last snapshot
    "stage_id",             # Project stage (New / In Progress / Done)
    "tag_ids",
    "is_template",
    "is_fsm",
    "allow_timesheets",
    "allow_milestones",
    "allow_recurring_tasks",
    "allow_task_dependencies",
    "allow_billable",
    "allocated_hours",
    "account_id",
    "favorite_user_ids",
    "alias_id",
]
```

### 2.2 `PROJECT_DETAIL_FIELDS` — Project settings form (stored + needed for form)

```python
PROJECT_DETAIL_FIELDS = PROJECT_LIST_FIELDS + [
    "description",
    "label_tasks",
    "billing_type",
    "allow_material",
    "allow_worksheets",
    "allow_quotations",
    "allow_geolocation",
    "hide_price",
    "sale_line_id",
    "reinvoiced_sale_order_id",
    "sale_line_employee_ids",
    "timesheet_product_id",
    "timesheet_ids",
    "milestone_ids",
    "type_ids",
    "collaborator_ids",
    "task_properties_definition",
    "rating_ids",
    "alias_name",
    "alias_contact",
    "alias_defaults",
    "update_ids",
    "documents_folder_id",
    "worksheet_template_id",
    "company_id",
    "message_follower_ids",
    "activity_ids",
]
```

### 2.3 `PROJECT_DASHBOARD_FIELDS` — Dashboard widget (computed OK — fetched individually)

```python
# Only use these when fetching a SINGLE project by id, never in list calls
PROJECT_DASHBOARD_FIELDS = [
    "id",
    "effective_hours",
    "remaining_hours",
    "total_timesheet_time",
    "task_count",
    "open_task_count",
    "closed_task_count",
    "task_completion_percentage",
    "milestone_count",
    "milestone_count_reached",
    "milestone_progress",
    "next_milestone_id",
    "analytic_account_balance",
    "sale_order_count",
    "invoice_count",
    "purchase_orders_count",
    "vendor_bill_count",
    "document_count",
    "update_count",
    "rating_count",
    "rating_avg",
    "rating_percentage_satisfaction",
    "is_project_overtime",
    "is_rotting",
    "rotting_days",
    "has_any_so_to_invoice",
    "display_sales_stat_buttons",
    "collaborator_count",
    "warning_employee_rate",
]
```

---

## 3. Django DRF Implementation

### 3.1 Serializer

```python
# apps/projects/serializers.py
from rest_framework import serializers


class ProjectSerializer(serializers.Serializer):
    """
    Validates inbound create/update data before passing to Odoo.
    Only writable, stored fields are listed here.
    Read-only / computed fields come back from Odoo as-is and are
    passed through without validation.
    """
    # Identity
    name                    = serializers.CharField(max_length=255)
    active                  = serializers.BooleanField(default=True)
    color                   = serializers.IntegerField(min_value=0, max_value=11, default=0)
    sequence                = serializers.IntegerField(default=10)
    is_template             = serializers.BooleanField(default=False)
    label_tasks             = serializers.CharField(max_length=64, required=False, allow_blank=True)
    description             = serializers.CharField(required=False, allow_blank=True)

    # Dates
    date_start              = serializers.DateField(required=False, allow_null=True)
    date                    = serializers.DateField(required=False, allow_null=True)   # deadline

    # Relationships
    partner_id              = serializers.IntegerField(required=False, allow_null=True)
    user_id                 = serializers.IntegerField(required=False, allow_null=True)
    company_id              = serializers.IntegerField(required=False, allow_null=True)
    tag_ids                 = serializers.ListField(child=serializers.IntegerField(), required=False)
    favorite_user_ids       = serializers.ListField(child=serializers.IntegerField(), required=False)

    # Visibility
    privacy_visibility      = serializers.ChoiceField(
        choices=["followers", "employees", "portal"],
        default="employees"
    )

    # Feature toggles
    allow_timesheets        = serializers.BooleanField(default=False)
    allow_milestones        = serializers.BooleanField(default=False)
    allow_recurring_tasks   = serializers.BooleanField(default=False)
    allow_task_dependencies = serializers.BooleanField(default=False)
    allow_billable          = serializers.BooleanField(default=False)
    allow_material          = serializers.BooleanField(default=False)
    allow_quotations        = serializers.BooleanField(default=False)
    allow_worksheets        = serializers.BooleanField(default=False)
    allow_geolocation       = serializers.BooleanField(default=False)
    hide_price              = serializers.BooleanField(default=False)

    # Billing
    billing_type            = serializers.ChoiceField(
        choices=["task_rate", "fixed_rate", "employee_rate"],
        required=False
    )
    sale_line_id            = serializers.IntegerField(required=False, allow_null=True)
    timesheet_product_id    = serializers.IntegerField(required=False, allow_null=True)

    # Hours
    allocated_hours         = serializers.FloatField(default=0.0)

    # Analytic
    account_id              = serializers.IntegerField(required=False, allow_null=True)

    # Status
    last_update_status      = serializers.ChoiceField(
        choices=["on_track", "at_risk", "off_track", "on_hold"],
        required=False
    )

    # Stage (project-level)
    stage_id                = serializers.IntegerField(required=False, allow_null=True)

    # Alias
    alias_name              = serializers.CharField(max_length=64, required=False, allow_blank=True)
    alias_contact           = serializers.ChoiceField(
        choices=["everyone", "partners", "followers"],
        required=False
    )
    alias_defaults          = serializers.CharField(required=False, allow_blank=True)  # JSON string

    def to_odoo(self, validated_data: dict) -> dict:
        """
        Convert validated data to Odoo-compatible format.
        many2one fields must be plain int (not list).
        many2many fields must use Odoo command tuples: [(6, 0, [id1, id2])]
        """
        payload = dict(validated_data)

        # many2many → Odoo command 6 (replace all)
        for m2m_field in ("tag_ids", "favorite_user_ids"):
            if m2m_field in payload:
                ids = payload[m2m_field]
                payload[m2m_field] = [(6, 0, ids)]

        return payload
```

### 3.2 ViewSet

```python
# apps/projects/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import ProjectSerializer
from .constants import PROJECT_LIST_FIELDS, PROJECT_DETAIL_FIELDS, PROJECT_DASHBOARD_FIELDS


class ProjectViewSet(ViewSet):
    """
    All methods proxy directly to Odoo project.project via XML-RPC.
    No local DB. No Django ORM.
    """

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/projects/
        Optional query params:
          ?active=true|false|all   (default: active only)
          ?is_template=true|false
          ?stage_id=<id>
          ?order=name|sequence     (default: sequence asc)
        """
        active_param = request.query_params.get("active", "true")
        domain = []

        if active_param == "true":
            domain.append(["active", "=", True])
        elif active_param == "false":
            domain.append(["active", "=", False])
        # "all" → no filter

        if request.query_params.get("is_template"):
            domain.append(["is_template", "=", request.query_params["is_template"] == "true"])

        if request.query_params.get("stage_id"):
            domain.append(["stage_id", "=", int(request.query_params["stage_id"])])

        order = request.query_params.get("order", "sequence asc")

        projects = odoo_call(
            "project.project", "search_read",
            [domain],
            {"fields": PROJECT_LIST_FIELDS, "order": order}
        )
        return Response(projects)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/projects/{id}/"""
        result = odoo_call(
            "project.project", "read",
            [[int(pk)]],
            {"fields": PROJECT_DETAIL_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """POST /api/projects/"""
        serializer = ProjectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        new_id = odoo_call("project.project", "create", [payload])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """PATCH /api/projects/{id}/"""
        serializer = ProjectSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        odoo_call("project.project", "write", [[int(pk)], payload])
        return Response({"id": int(pk)})

    # ── Delete (Archive) ──────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/projects/{id}/
        Odoo projects should be archived, not unlinked (unlink fails if tasks exist).
        Archive by setting active=False.
        """
        odoo_call("project.project", "write", [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Custom Actions ────────────────────────────────────────────

    @action(detail=True, methods=["get"], url_path="dashboard")
    def dashboard(self, request, pk=None):
        """
        GET /api/projects/{id}/dashboard/
        Fetches computed stats for the project dashboard widget.
        Only call this for a single project — never in a list loop.
        """
        result = odoo_call(
            "project.project", "read",
            [[int(pk)]],
            {"fields": PROJECT_DASHBOARD_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    @action(detail=True, methods=["patch"], url_path="archive")
    def archive(self, request, pk=None):
        """PATCH /api/projects/{id}/archive/ — soft-delete"""
        odoo_call("project.project", "write", [[int(pk)], {"active": False}])
        return Response({"id": int(pk), "active": False})

    @action(detail=True, methods=["patch"], url_path="unarchive")
    def unarchive(self, request, pk=None):
        """PATCH /api/projects/{id}/unarchive/"""
        odoo_call("project.project", "write", [[int(pk)], {"active": True}])
        return Response({"id": int(pk), "active": True})

    @action(detail=True, methods=["patch"], url_path="status")
    def set_status(self, request, pk=None):
        """
        PATCH /api/projects/{id}/status/
        Body: { "status": "on_track" | "at_risk" | "off_track" | "on_hold" }
        Updates the project status dot without creating a full Project Update.
        """
        allowed = {"on_track", "at_risk", "off_track", "on_hold"}
        new_status = request.data.get("status")
        if new_status not in allowed:
            return Response({"detail": f"status must be one of {allowed}"}, status=400)
        odoo_call("project.project", "write",
                  [[int(pk)], {"last_update_status": new_status}])
        return Response({"id": int(pk), "last_update_status": new_status})

    @action(detail=False, methods=["get"], url_path="templates")
    def templates(self, request):
        """GET /api/projects/templates/ — project templates only"""
        projects = odoo_call(
            "project.project", "search_read",
            [[["is_template", "=", True]]],
            {"fields": PROJECT_LIST_FIELDS, "order": "name asc"}
        )
        return Response(projects)

    @action(detail=True, methods=["post"], url_path="duplicate")
    def duplicate(self, request, pk=None):
        """
        POST /api/projects/{id}/duplicate/
        Calls Odoo copy() which duplicates a project with all its stages and tasks.
        Optional body: { "name": "New Project Name" }
        """
        defaults = {}
        if request.data.get("name"):
            defaults["name"] = request.data["name"]
        new_id = odoo_call("project.project", "copy", [[int(pk)], defaults])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)
```

### 3.3 URL Configuration

```python
# apps/projects/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet

router = DefaultRouter()
router.register(r"projects", ProjectViewSet, basename="project")

urlpatterns = [
    path("", include(router.urls)),
]

# Registered routes:
# GET    /api/projects/
# POST   /api/projects/
# GET    /api/projects/{id}/
# PATCH  /api/projects/{id}/
# DELETE /api/projects/{id}/
# GET    /api/projects/{id}/dashboard/
# PATCH  /api/projects/{id}/archive/
# PATCH  /api/projects/{id}/unarchive/
# PATCH  /api/projects/{id}/status/
# GET    /api/projects/templates/
# POST   /api/projects/{id}/duplicate/
```

---

## 4. React API Layer

```javascript
// src/api/projects.js
import client from "./client"; // Axios instance with baseURL="/api"

// ── List ──────────────────────────────────────────────────────────
export const getProjects = (params = {}) =>
  client.get("/projects/", { params }).then((r) => r.data);

// params examples:
//   { active: "true" }              → active projects only (default)
//   { active: "false" }             → archived projects
//   { active: "all" }               → all projects
//   { is_template: "true" }         → templates
//   { stage_id: 5 }                 → filtered by project stage
//   { order: "name asc" }           → sorted by name

// ── Templates (shortcut) ─────────────────────────────────────────
export const getProjectTemplates = () =>
  client.get("/projects/templates/").then((r) => r.data);

// ── Detail ────────────────────────────────────────────────────────
export const getProject = (id) =>
  client.get(`/projects/${id}/`).then((r) => r.data);

// ── Dashboard stats ───────────────────────────────────────────────
export const getProjectDashboard = (id) =>
  client.get(`/projects/${id}/dashboard/`).then((r) => r.data);

// ── Create ────────────────────────────────────────────────────────
export const createProject = (data) =>
  client.post("/projects/", data).then((r) => r.data);

// data shape (all fields optional except name):
// {
//   name: "My Project",
//   partner_id: 14,
//   user_id: 3,
//   date_start: "2026-04-01",
//   date: "2026-12-31",
//   color: 3,
//   privacy_visibility: "employees",
//   allow_timesheets: true,
//   allow_milestones: true,
//   allow_task_dependencies: true,
//   allow_billable: true,
//   billing_type: "task_rate",
//   allocated_hours: 200,
//   tag_ids: [1, 4],
// }

// ── Update ────────────────────────────────────────────────────────
export const updateProject = (id, data) =>
  client.patch(`/projects/${id}/`, data).then((r) => r.data);

// ── Archive / Restore ─────────────────────────────────────────────
export const archiveProject = (id) =>
  client.patch(`/projects/${id}/archive/`).then((r) => r.data);

export const unarchiveProject = (id) =>
  client.patch(`/projects/${id}/unarchive/`).then((r) => r.data);

// ── Status dot ────────────────────────────────────────────────────
export const setProjectStatus = (id, statusValue) =>
  client.patch(`/projects/${id}/status/`, { status: statusValue }).then((r) => r.data);
// statusValue: "on_track" | "at_risk" | "off_track" | "on_hold"

// ── Duplicate ─────────────────────────────────────────────────────
export const duplicateProject = (id, name = null) =>
  client.post(`/projects/${id}/duplicate/`, name ? { name } : {}).then((r) => r.data);
```

---

## 5. React Query Hooks

```javascript
// src/hooks/useProjects.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/projects";

// ── List ──────────────────────────────────────────────────────────
export const useProjects = (params = {}) =>
  useQuery({
    queryKey: ["projects", params],
    queryFn: () => api.getProjects(params),
    staleTime: 30_000, // 30 seconds
  });

// ── Detail ────────────────────────────────────────────────────────
export const useProject = (id) =>
  useQuery({
    queryKey: ["projects", id],
    queryFn: () => api.getProject(id),
    enabled: !!id,
  });

// ── Dashboard stats ───────────────────────────────────────────────
export const useProjectDashboard = (id) =>
  useQuery({
    queryKey: ["projects", id, "dashboard"],
    queryFn: () => api.getProjectDashboard(id),
    enabled: !!id,
    staleTime: 60_000, // computed fields — refresh every 60s
  });

// ── Create ────────────────────────────────────────────────────────
export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};

// ── Update ────────────────────────────────────────────────────────
export const useUpdateProject = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.updateProject(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

// ── Status dot (optimistic) ───────────────────────────────────────
export const useSetProjectStatus = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (statusValue) => api.setProjectStatus(id, statusValue),
    onMutate: async (statusValue) => {
      await qc.cancelQueries({ queryKey: ["projects"] });
      const prev = qc.getQueryData(["projects"]);
      qc.setQueryData(["projects"], (old) =>
        old?.map((p) =>
          p.id === id ? { ...p, last_update_status: statusValue } : p
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["projects"], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};

// ── Archive ───────────────────────────────────────────────────────
export const useArchiveProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archiveProject,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["projects"] }),
  });
};
```

---

## 6. Odoo Domain Filter Reference

Use these in the `domain` arg of `search_read` when building filtered views.

```python
# Active projects only (default)
[["active", "=", True]]

# All (including archived)
[]

# Archived only
[["active", "=", False]]

# Projects managed by a specific user
[["user_id", "=", uid]]

# Projects for a specific customer
[["partner_id", "=", partner_id]]

# Projects tagged with a specific tag
[["tag_ids", "in", [tag_id]]]

# Projects that have timesheets enabled
[["allow_timesheets", "=", True]]

# Projects in a specific stage
[["stage_id", "=", stage_id]]

# Projects with status "at_risk" or "off_track"
[["last_update_status", "in", ["at_risk", "off_track"]]]

# Template projects only
[["is_template", "=", True]]

# Projects linked to a specific analytic account
[["account_id", "=", analytic_account_id]]

# Combine: active + billable + specific manager
[
    ["active", "=", True],
    ["allow_billable", "=", True],
    ["user_id", "=", uid],
]
```

---

## 7. Status Dot Reference

The `last_update_status` field drives the colored dot on every project card.

| Odoo value | Label | Color | When to use |
|---|---|---|---|
| `on_track` | On Track | 🟢 Green | Everything going well |
| `at_risk` | At Risk | 🟡 Orange | Minor delays or blockers |
| `off_track` | Off Track | 🔴 Red | Significant issues |
| `on_hold` | On Hold | ⚫ Grey | Paused deliberately |

Map these in React:

```javascript
// src/utils/odooStatus.js
export const PROJECT_STATUS_MAP = {
  on_track:  { label: "On Track",  color: "#22c55e", dot: "🟢" },
  at_risk:   { label: "At Risk",   color: "#f97316", dot: "🟡" },
  off_track: { label: "Off Track", color: "#ef4444", dot: "🔴" },
  on_hold:   { label: "On Hold",   color: "#6b7280", dot: "⚫" },
};

export const getStatusStyle = (status) =>
  PROJECT_STATUS_MAP[status] ?? PROJECT_STATUS_MAP["on_track"];
```

---

## 8. Privacy Visibility Reference

The `privacy_visibility` field controls who can see the project.

| Odoo value | Label | Who sees it |
|---|---|---|
| `followers` | Invited internal users and portal users | Only explicitly added followers + portal users |
| `employees` | All internal users | All logged-in employees |
| `portal` | Invited portal users and all internal users | Same as `followers` but portal users get read access |

---

## 9. Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| `date` not `deadline` | Project deadline field is named `date` in API (not `deadline` — that's `project.task`) | Always use `"date"` for project deadline |
| Archive don't delete | `unlink` on a project with tasks raises `ValidationError` | Always use `write active=False` to archive |
| many2many format | Sending `[1, 2, 3]` directly to Odoo for `tag_ids` fails | Use `[(6, 0, [1, 2, 3])]` — the `to_odoo()` method handles this |
| Computed fields in list | Requesting `effective_hours` in `search_read` on 200 projects triggers 200 SQL queries | Only request computed fields via `/dashboard/` (single project) |
| `stage_id` ambiguity | `project.project` has its own `stage_id` (→ `project.project.stage`) which is different from task `stage_id` (→ `project.task.type`) | Keep model names explicit in comments |
| `alias_id` required | Odoo auto-creates the alias on project create — never set `alias_id` directly | Set `alias_name` (the prefix string) if you need to control the email |
| `billing_type` default | Odoo sets `billing_type` as required but only shown when `allow_billable=True` | Always send `billing_type: "task_rate"` when `allow_billable=True` |
