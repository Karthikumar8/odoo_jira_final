# Skill: Activities — `mail.activity` + `mail.activity.type`

**Odoo models**: `mail.activity` · `mail.activity.type`  
**CSV source**: `edu-primesoft` — `mail.activity` 39 fields · `mail.activity.type` 31 fields (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC

---

## 1. What Activities Are in Odoo Project

An activity is a scheduled action attached to any Odoo record — a task, a project, a sale order. In the Project module specifically:

- Activities appear as **icons on the Kanban card** (phone, email, meeting, to-do)
- They appear in the **chatter** at the bottom of every task form
- They appear in the user's **top-bar bell** and personal **To-Do list**
- An activity has a **due date**, an **assigned user**, a **type** (call, email, meeting), and an optional **note**
- When marked done, the user provides **feedback** and the activity is closed
- Activities can trigger the **next activity** automatically (`chaining_type`)

Two models work together:
- `mail.activity.type` — the catalogue of activity types (Email, Call, Meeting, To-Do, Upload Document…)
- `mail.activity` — one scheduled activity instance on a specific record

---

## Part A — `mail.activity.type` (Activity Type Catalogue)

### A.1 Field Reference Table

All 31 fields. All `store=True` unless noted.

| Odoo Field | Label | Type | Relation | store | required | readonly | Notes |
|---|---|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Name | char | — | ✅ | ✅ | ✅ | Type label e.g. "Email", "Call", "Meeting" |
| `active` | Active | boolean | ✅ | ❌ | ❌ | False = archived |
| `sequence` | Sequence | integer | ✅ | ❌ | ❌ | Display order in type selector |
| `icon` | Icon | char | ✅ | ❌ | ❌ | FA icon class e.g. `fa-phone`, `fa-envelope` |
| `category` | Action | selection | ✅ | ❌ | ❌ | `default` · `upload_file` · `phonecall` |
| `decoration_type` | Decoration Type | selection | ✅ | ❌ | ❌ | `warning` · `danger` — drives icon color on card |
| `chaining_type` | Chaining Type | selection | ✅ | ✅ | ✅ | `suggest` · `trigger` — what happens after done |
| `delay_count` | Schedule | integer | ✅ | ❌ | ❌ | Auto-schedule delay amount |
| `delay_unit` | Delay Units | selection | ✅ | ✅ | ✅ | `days` · `weeks` · `months` |
| `delay_from` | Delay Type | selection | ✅ | ✅ | ✅ | `current_date` · `previous_activity` |
| `delay_label` | Delay Label | char | ❌ | ❌ | ✅ | Computed display string |
| `res_model` | Model | selection | ✅ | ❌ | ❌ | Restrict to a specific model (e.g. `project.task`) |
| `res_model_change` | Model has Change | boolean | ❌ | ❌ | ❌ | UI helper |
| `initial_res_model` | Initial Model | selection | ❌ | ❌ | ✅ | Computed |
| `default_user_id` | Default User | many2one | `res.users` | ✅ | ❌ | ❌ | Auto-assign this user when activity created |
| `default_note` | Default Note | html | ✅ | ❌ | ❌ | Pre-filled note |
| `summary` | Default Summary | char | ✅ | ❌ | ❌ | Pre-filled summary |
| `dashboard_visibility` | Dashboard Visibility | selection | ✅ | ❌ | ❌ | `user` · `everyone` |
| `mail_template_ids` | Email Templates | many2many | `mail.template` | ✅ | ❌ | ❌ | Email templates available for this type |
| `previous_type_ids` | Preceding Activities | many2many | `mail.activity.type` | ✅ | ❌ | ❌ | Which types can precede this one |
| `suggested_next_type_ids` | Suggest | many2many | `mail.activity.type` | ✅ | ❌ | ❌ | Types suggested after completion |
| `triggered_next_type_id` | Trigger | many2one | `mail.activity.type` | ✅ | ❌ | ❌ | Auto-create this type after completion |
| `tag_ids` | Tag | many2many | `documents.tag` | ✅ | ❌ | ❌ | Document tags |
| `folder_id` | Folder | many2one | `documents.document` | ✅ | ❌ | ❌ | Documents folder |
| `default_sign_template_id` | Default Signature Template | many2one | `sign.template` | ✅ | ❌ | ❌ | Sign module |
| `display_name` | Display Name | char | ❌ | ❌ | ✅ | Computed |
| `create_date` | Created on | datetime | ✅ | ❌ | ✅ | System |
| `write_date` | Last Updated on | datetime | ✅ | ❌ | ✅ | System |
| `create_uid` | Create Uid | many2one | `res.users` | ✅ | ❌ | ❌ | |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | ❌ | ✅ | |

### A.2 Built-in Activity Types (Standard Odoo)

These exist by default in every Odoo instance. Fetch them with the field set below and cache on frontend load.

| Name | `icon` | `category` | `chaining_type` | Notes |
|---|---|---|---|---|
| Email | `fa-envelope` | `default` | `suggest` | Send/log an email |
| Call | `fa-phone` | `phonecall` | `suggest` | Log a phone call |
| Meeting | `fa-calendar` | `default` | `suggest` | Creates `calendar.event` |
| To-Do | `fa-check-circle` | `default` | `suggest` | Generic reminder |
| Upload Document | `fa-upload` | `upload_file` | `suggest` | Attach a file |
| Sign | `fa-pencil-square` | `default` | `suggest` | Sign.module activity |

### A.3 `chaining_type` Values

| Value | Behaviour after marking done |
|---|---|
| `suggest` | Shows a list of `suggested_next_type_ids` for the user to optionally schedule |
| `trigger` | Auto-creates `triggered_next_type_id` activity immediately |

### A.4 Field Set

```python
# apps/activities/constants.py

ACTIVITY_TYPE_FIELDS = [
    "id",
    "name",
    "active",
    "sequence",
    "icon",
    "category",
    "decoration_type",
    "chaining_type",
    "delay_count",
    "delay_unit",
    "delay_from",
    "res_model",
    "default_user_id",
    "default_note",
    "summary",
    "mail_template_ids",
    "suggested_next_type_ids",
    "triggered_next_type_id",
]
```

### A.5 ViewSet

```python
# apps/activities/views_types.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from services.odoo_client import odoo_call
from .constants import ACTIVITY_TYPE_FIELDS


class ActivityTypeViewSet(ViewSet):

    def list(self, request):
        """
        GET /api/activity-types/
        Optional: ?model=project.task  → filter types available for tasks
        Fetch once on app load and cache — these rarely change.
        """
        domain = [["active", "=", True]]

        model_filter = request.query_params.get("model")
        if model_filter:
            # res_model = False means type is available for all models
            domain = [
                ["active", "=", True],
                "|",
                ["res_model", "=", model_filter],
                ["res_model", "=", False],
            ]

        types = odoo_call(
            "mail.activity.type", "search_read",
            [domain],
            {"fields": ACTIVITY_TYPE_FIELDS, "order": "sequence asc"}
        )
        return Response(types)

    def retrieve(self, request, pk=None):
        """GET /api/activity-types/{id}/"""
        result = odoo_call(
            "mail.activity.type", "read",
            [[int(pk)]],
            {"fields": ACTIVITY_TYPE_FIELDS}
        )
        if not result:
            from rest_framework import status
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])
```

---

## Part B — `mail.activity` (Scheduled Activity Instances)

### B.1 Field Reference Table

All 39 fields.

| Odoo Field | Label | Type | Relation | store | required | readonly | Notes |
|---|---|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | ✅ | ✅ | Auto-assigned |
| `active` | Active | boolean | ✅ | ❌ | ❌ | False = done/archived |
| `activity_type_id` | Activity Type | many2one | `mail.activity.type` | ✅ | ❌ | ❌ | Required in practice — type of activity |
| `summary` | Summary | char | ✅ | ❌ | ❌ | Short label shown on Kanban icon |
| `note` | Note | html | ✅ | ❌ | ❌ | Detailed note / instructions |
| `date_deadline` | Due Date | date | ✅ | ✅ | ❌ | When the activity must be done |
| `date_done` | Done Date | date | ✅ | ❌ | ❌ | Set when marked done |
| `feedback` | Feedback | text | ✅ | ❌ | ❌ | Outcome note written when marking done |
| `user_id` | Assigned to | many2one | `res.users` | ✅ | ❌ | ❌ | Who must complete the activity |
| `state` | State | selection | ❌ | ❌ | ✅ | Computed: `overdue` · `today` · `planned` |
| `automated` | Automated Activity | boolean | ✅ | ❌ | ✅ | True = created by automation rule |

### B.2 Record Link Fields

Activities are polymorphic — they can attach to any Odoo model. In the Project context:

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `res_id` | Related Document ID | many2one_reference | ✅ | The ID of the linked record (e.g. task ID = 42) |
| `res_model` | Related Document Model | char | ✅ | The model name e.g. `"project.task"` |
| `res_model_id` | Document Model | many2one → `ir.model` | ✅ | ir.model record |
| `res_name` | Document Name | char | ✅ | ✅ Display name of the linked record |

### B.3 Chaining & Follow-up Fields

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `chaining_type` | Chaining Type | selection | — | ❌ | Computed from `activity_type_id.chaining_type` |
| `previous_activity_type_id` | Previous Activity Type | many2one | `mail.activity.type` | ✅ | ✅ Set when this was auto-chained |
| `recommended_activity_type_id` | Recommended Activity Type | many2one | `mail.activity.type` | ✅ | ❌ User's chosen next type |
| `has_recommended_activities` | Next Activities Available | boolean | ❌ | ✅ | Computed |

### B.4 Calendar Meeting Integration

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `calendar_event_id` | Calendar Meeting | many2one | `calendar.event` | ✅ | Set when activity type = Meeting — links to calendar |

### B.5 Phone / Call Fields

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `phone` | Phone | char | ✅ | Phone number (for phonecall type) |
| `phone_country_id` | Phone Country | many2one → `res.country` | ❌ | Computed |
| `country_code_from_phone` | Country Code | char | ❌ | Computed |

### B.6 Approval / Studio Fields (ignore in project context)

| Odoo Field | Notes |
|---|---|
| `approval_request_id` | Approval module only |
| `approver_id` | Approval module only |
| `studio_approval_request_id` | Studio module only |
| `request_partner_id` | Requesting partner (approvals) |

### B.7 Attachments & Permissions

| Odoo Field | Label | Type | store | Notes |
|---|---|---|---|---|
| `attachment_ids` | Attachments | many2many → `ir.attachment` | ✅ | Files attached to this activity |
| `mail_template_ids` | Email Templates | many2many → `mail.template` | ❌ | Computed from type |
| `can_write` | Can Write | boolean | ❌ | Computed — current user can edit? |
| `icon` | Icon | char | ❌ | Computed from `activity_type_id.icon` |
| `activity_category` | Action | selection | ❌ | Computed from type |
| `activity_decoration` | Decoration Type | selection | ❌ | Computed — `warning` or `danger` |

### B.8 System Fields

| Odoo Field | store | readonly |
|---|---|---|
| `create_date` | ✅ | ✅ |
| `write_date` | ✅ | ✅ |
| `create_uid` → `res.users` | ✅ | ✅ |
| `write_uid` → `res.users` | ✅ | ✅ |
| `user_tz` | ✅ | ✅ |
| `display_name` | ❌ | ✅ |

---

## 2. Field Sets for Odoo API Calls

```python
# apps/activities/constants.py

ACTIVITY_LIST_FIELDS = [
    "id",
    "active",
    "activity_type_id",
    "summary",
    "note",
    "date_deadline",
    "date_done",
    "user_id",
    "res_id",
    "res_model",
    "res_name",
    "state",           # computed but lightweight — OK in list
    "icon",            # computed from type — OK in list
    "activity_category",
    "activity_decoration",
    "automated",
    "calendar_event_id",
    "feedback",
    "attachment_ids",
]

ACTIVITY_DETAIL_FIELDS = ACTIVITY_LIST_FIELDS + [
    "chaining_type",
    "recommended_activity_type_id",
    "previous_activity_type_id",
    "has_recommended_activities",
    "phone",
    "mail_template_ids",
    "can_write",
    "res_model_id",
    "write_date",
    "create_uid",
    "user_tz",
]
```

---

## 3. Django DRF Implementation

### 3.1 Serializer

```python
# apps/activities/serializers.py
from rest_framework import serializers


class ActivitySerializer(serializers.Serializer):
    # Type & content
    activity_type_id            = serializers.IntegerField()
    summary                     = serializers.CharField(
        max_length=255, required=False, allow_blank=True,
        help_text="Short label shown on Kanban card icon tooltip"
    )
    note                        = serializers.CharField(
        required=False, allow_blank=True,
        help_text="Detailed HTML note"
    )
    date_deadline               = serializers.DateField()

    # Assignment
    user_id                     = serializers.IntegerField(
        required=False,
        help_text="Defaults to current user if not set"
    )

    # Record link — required on create
    res_model                   = serializers.CharField(
        max_length=100,
        help_text="e.g. 'project.task' or 'project.project'"
    )
    res_id                      = serializers.IntegerField(
        help_text="ID of the linked record (task id, project id, etc.)"
    )

    # Follow-up
    recommended_activity_type_id = serializers.IntegerField(
        required=False, allow_null=True
    )

    # Phone (for phonecall type)
    phone                       = serializers.CharField(
        max_length=50, required=False, allow_blank=True
    )

    # Feedback (on mark done)
    feedback                    = serializers.CharField(
        required=False, allow_blank=True
    )
```

### 3.2 ViewSet

```python
# apps/activities/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import ActivitySerializer
from .constants import ACTIVITY_LIST_FIELDS, ACTIVITY_DETAIL_FIELDS


class ActivityViewSet(ViewSet):

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/activities/
        Query params:
          ?res_model=project.task       filter by model (almost always set)
          ?res_id=<id>                  filter by specific record
          ?user_id=<id>                 filter by assigned user
          ?state=overdue|today|planned  filter by state
          ?active=true|false|all        default: true (open activities only)

        Most common usage:
          GET /api/activities/?res_model=project.task&res_id=42
          → all activities on task 42

          GET /api/activities/?res_model=project.task&user_id=3
          → all task activities assigned to user 3
        """
        params = request.query_params
        domain = []

        if params.get("res_model"):
            domain.append(["res_model", "=", params["res_model"]])

        if params.get("res_id"):
            domain.append(["res_id", "=", int(params["res_id"])])

        if params.get("user_id"):
            domain.append(["user_id", "=", int(params["user_id"])])

        # state is computed — filter by date_deadline instead
        if params.get("state") == "overdue":
            from datetime import date
            domain.append(["date_deadline", "<", date.today().isoformat()])
            domain.append(["active", "=", True])
        elif params.get("state") == "today":
            from datetime import date
            today = date.today().isoformat()
            domain.append(["date_deadline", "=", today])
            domain.append(["active", "=", True])
        elif params.get("state") == "planned":
            from datetime import date
            domain.append(["date_deadline", ">", date.today().isoformat()])
            domain.append(["active", "=", True])
        else:
            active_param = params.get("active", "true")
            if active_param == "true":
                domain.append(["active", "=", True])
            elif active_param == "false":
                domain.append(["active", "=", False])

        activities = odoo_call(
            "mail.activity", "search_read",
            [domain],
            {"fields": ACTIVITY_LIST_FIELDS, "order": "date_deadline asc"}
        )
        return Response(activities)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/activities/{id}/"""
        result = odoo_call(
            "mail.activity", "read",
            [[int(pk)]],
            {"fields": ACTIVITY_DETAIL_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """
        POST /api/activities/
        Body: {
          "activity_type_id": 4,
          "summary": "Follow up with client",
          "date_deadline": "2026-04-10",
          "user_id": 3,
          "res_model": "project.task",
          "res_id": 42,
          "note": "<p>Call Monica to discuss the proposal.</p>"
        }

        Odoo alternative — calling action_schedule_activities on the record:
        This is equivalent and preferred when you already have the task/project
        context (avoids sending res_model and res_id separately):
          odoo_call("project.task", "activity_schedule", [[task_id]], {
              "activity_type_id": 4,
              "summary": "Follow up",
              "date_deadline": "2026-04-10",
              "user_id": 3,
          })
        Both approaches create the same record.
        """
        serializer = ActivitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_id = odoo_call(
            "mail.activity", "create",
            [serializer.validated_data]
        )
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """PATCH /api/activities/{id}/"""
        serializer = ActivitySerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        odoo_call(
            "mail.activity", "write",
            [[int(pk)], serializer.validated_data]
        )
        return Response({"id": int(pk)})

    # ── Delete ────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/activities/{id}/
        Cancels the activity without marking it done (no feedback recorded).
        Uses unlink — activities are deleted, not archived, when cancelled.
        """
        odoo_call("mail.activity", "unlink", [[int(pk)]])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Mark Done ─────────────────────────────────────────────────
    @action(detail=True, methods=["post"], url_path="done")
    def mark_done(self, request, pk=None):
        """
        POST /api/activities/{id}/done/
        Body: {
          "feedback": "Called Monica — she agreed to the proposal.",
          "attachment_ids": [12, 15]   (optional)
        }

        Calls Odoo's action_feedback() which:
          1. Marks the activity done (active=False)
          2. Writes feedback to the chatter as a log note
          3. Sets date_done = today
          4. Auto-creates next activity if chaining_type = "trigger"
          5. Returns suggested next types if chaining_type = "suggest"
        """
        feedback = request.data.get("feedback", "")
        attachment_ids = request.data.get("attachment_ids", [])

        try:
            result = odoo_call(
                "mail.activity", "action_feedback",
                [[int(pk)]],
                {
                    "feedback": feedback,
                    "attachment_ids": attachment_ids if attachment_ids else False,
                }
            )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "id": int(pk),
            "done": True,
            "next_activity": result if isinstance(result, dict) else None,
        })

    # ── Mark Done with Next Activity ──────────────────────────────
    @action(detail=True, methods=["post"], url_path="done-and-schedule")
    def mark_done_and_schedule(self, request, pk=None):
        """
        POST /api/activities/{id}/done-and-schedule/
        Body: {
          "feedback": "Done.",
          "next_activity_type_id": 5,
          "next_date_deadline": "2026-04-15",
          "next_summary": "Follow up call",
          "next_user_id": 3
        }
        Marks current activity done and schedules the next one in one call.
        """
        feedback = request.data.get("feedback", "")
        next_type_id = request.data.get("next_activity_type_id")
        next_deadline = request.data.get("next_date_deadline")
        next_summary = request.data.get("next_summary", "")
        next_user_id = request.data.get("next_user_id")

        # 1. Mark current done
        odoo_call(
            "mail.activity", "action_feedback",
            [[int(pk)]],
            {"feedback": feedback}
        )

        # 2. Schedule next if provided
        new_activity_id = None
        if next_type_id and next_deadline:
            # Get res_model and res_id from the done activity first
            done = odoo_call(
                "mail.activity", "read",
                [[int(pk)]],
                {"fields": ["res_model", "res_id"]}
            )
            if done:
                new_payload = {
                    "activity_type_id": int(next_type_id),
                    "date_deadline": next_deadline,
                    "res_model": done[0]["res_model"],
                    "res_id": done[0]["res_id"],
                }
                if next_summary:
                    new_payload["summary"] = next_summary
                if next_user_id:
                    new_payload["user_id"] = int(next_user_id)
                new_activity_id = odoo_call(
                    "mail.activity", "create", [new_payload]
                )

        return Response({
            "done_id": int(pk),
            "next_id": new_activity_id,
        })

    # ── Activities for a specific task ────────────────────────────
    @action(detail=False, methods=["get"], url_path="for-task")
    def for_task(self, request):
        """
        GET /api/activities/for-task/?task_id=<id>
        Shortcut — activities on a specific task only.
        """
        task_id = request.query_params.get("task_id")
        if not task_id:
            return Response({"detail": "task_id required"}, status=400)

        activities = odoo_call(
            "mail.activity", "search_read",
            [[
                ["res_model", "=", "project.task"],
                ["res_id", "=", int(task_id)],
                ["active", "=", True],
            ]],
            {"fields": ACTIVITY_LIST_FIELDS, "order": "date_deadline asc"}
        )
        return Response(activities)

    # ── My Activities (To-Do list) ────────────────────────────────
    @action(detail=False, methods=["get"], url_path="my")
    def my_activities(self, request):
        """
        GET /api/activities/my/
        All open activities assigned to the current user across all models.
        Query: ?res_model=project.task (optional — filter by model)
        """
        uid = request.session.get("odoo_uid")
        domain = [
            ["user_id", "=", uid],
            ["active", "=", True],
        ]
        if request.query_params.get("res_model"):
            domain.append(["res_model", "=", request.query_params["res_model"]])

        activities = odoo_call(
            "mail.activity", "search_read",
            [domain],
            {"fields": ACTIVITY_LIST_FIELDS, "order": "date_deadline asc"}
        )
        return Response(activities)
```

### 3.3 URL Configuration

```python
# apps/activities/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ActivityViewSet
from .views_types import ActivityTypeViewSet

router = DefaultRouter()
router.register(r"activities", ActivityViewSet, basename="activity")
router.register(r"activity-types", ActivityTypeViewSet, basename="activity-type")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/activity-types/
# GET    /api/activity-types/{id}/
# GET    /api/activities/?res_model=project.task&res_id={id}
# GET    /api/activities/for-task/?task_id={id}
# GET    /api/activities/my/
# POST   /api/activities/
# GET    /api/activities/{id}/
# PATCH  /api/activities/{id}/
# DELETE /api/activities/{id}/
# POST   /api/activities/{id}/done/
# POST   /api/activities/{id}/done-and-schedule/
```

---

## 4. React API Layer

```javascript
// src/api/activities.js
import client from "./client";

// ── Activity Types (fetch once, cache) ────────────────────────────
export const getActivityTypes = (model = null) =>
  client
    .get("/activity-types/", { params: model ? { model } : {} })
    .then((r) => r.data);

// ── List ──────────────────────────────────────────────────────────
export const getActivities = (params = {}) =>
  client.get("/activities/", { params }).then((r) => r.data);

// ── For a task ────────────────────────────────────────────────────
export const getTaskActivities = (taskId) =>
  client
    .get("/activities/for-task/", { params: { task_id: taskId } })
    .then((r) => r.data);

// ── My activities ─────────────────────────────────────────────────
export const getMyActivities = (resModel = null) =>
  client
    .get("/activities/my/", { params: resModel ? { res_model: resModel } : {} })
    .then((r) => r.data);

// ── Create ────────────────────────────────────────────────────────
export const createActivity = (data) =>
  client.post("/activities/", data).then((r) => r.data);
// data: { activity_type_id, summary, date_deadline, user_id, res_model, res_id, note }

// ── Update ────────────────────────────────────────────────────────
export const updateActivity = (id, data) =>
  client.patch(`/activities/${id}/`, data).then((r) => r.data);

// ── Cancel (delete) ───────────────────────────────────────────────
export const cancelActivity = (id) =>
  client.delete(`/activities/${id}/`).then((r) => r.data);

// ── Mark done ─────────────────────────────────────────────────────
export const markActivityDone = (id, feedback = "", attachmentIds = []) =>
  client
    .post(`/activities/${id}/done/`, { feedback, attachment_ids: attachmentIds })
    .then((r) => r.data);

// ── Mark done + schedule next ─────────────────────────────────────
export const markDoneAndSchedule = (id, data) =>
  client.post(`/activities/${id}/done-and-schedule/`, data).then((r) => r.data);
```

---

## 5. React Query Hooks

```javascript
// src/hooks/useActivities.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/activities";

// ── Activity types (app-level cache) ──────────────────────────────
export const useActivityTypes = (model = "project.task") =>
  useQuery({
    queryKey: ["activity-types", model],
    queryFn: () => api.getActivityTypes(model),
    staleTime: 5 * 60_000, // 5 minutes — types change very rarely
  });

// ── Activities for a task ─────────────────────────────────────────
export const useTaskActivities = (taskId) =>
  useQuery({
    queryKey: ["activities", "task", taskId],
    queryFn: () => api.getTaskActivities(taskId),
    enabled: !!taskId,
    staleTime: 15_000,
  });

// ── My activities (To-Do list / top-bar bell) ─────────────────────
export const useMyActivities = (resModel = null) =>
  useQuery({
    queryKey: ["activities", "my", resModel],
    queryFn: () => api.getMyActivities(resModel),
    staleTime: 15_000,
    refetchInterval: 60_000, // poll every 60s for bell updates
  });

// ── Create ────────────────────────────────────────────────────────
export const useCreateActivity = (taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createActivity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "task", taskId] });
      qc.invalidateQueries({ queryKey: ["activities", "my"] });
      // Task activity_ids and activity_state update
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
};

// ── Update ────────────────────────────────────────────────────────
export const useUpdateActivity = (taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateActivity(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "task", taskId] });
      qc.invalidateQueries({ queryKey: ["activities", "my"] });
    },
  });
};

// ── Cancel ────────────────────────────────────────────────────────
export const useCancelActivity = (taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.cancelActivity,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "task", taskId] });
      qc.invalidateQueries({ queryKey: ["activities", "my"] });
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
};

// ── Mark done (optimistic) ────────────────────────────────────────
export const useMarkActivityDone = (taskId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, feedback, attachmentIds }) =>
      api.markActivityDone(id, feedback, attachmentIds),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ["activities", "task", taskId] });
      const prev = qc.getQueryData(["activities", "task", taskId]);
      // Optimistically remove from list — it becomes inactive on done
      qc.setQueryData(["activities", "task", taskId], (old) =>
        old?.filter((a) => a.id !== id)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      qc.setQueryData(["activities", "task", taskId], ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["activities", "task", taskId] });
      qc.invalidateQueries({ queryKey: ["activities", "my"] });
      if (taskId) qc.invalidateQueries({ queryKey: ["tasks", taskId] });
    },
  });
};
```

---

## 6. Activity Icon Component (Kanban Card)

The row of coloured icons shown at the bottom of every Kanban task card.

```javascript
// src/components/ActivityIcons/ActivityIcons.jsx

// state → colour mapping (matches Odoo's decoration_type)
const STATE_COLOR = {
  overdue: "#ef4444",  // red
  today:   "#f97316",  // orange
  planned: "#22c55e",  // green
};

export default function ActivityIcons({ activities = [], onIconClick }) {
  if (!activities.length) return null;

  // Group by state — show worst state first
  const sorted = [...activities].sort((a, b) => {
    const order = { overdue: 0, today: 1, planned: 2 };
    return (order[a.state] ?? 3) - (order[b.state] ?? 3);
  });

  return (
    <div className="flex items-center gap-1">
      {sorted.map((activity) => (
        <button
          key={activity.id}
          onClick={() => onIconClick?.(activity)}
          title={activity.summary || activity.res_name}
          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs"
          style={{ backgroundColor: STATE_COLOR[activity.state] ?? "#94a3b8" }}
        >
          <i className={`fa ${activity.icon ?? "fa-clock-o"}`} />
        </button>
      ))}
    </div>
  );
}
```

---

## 7. Schedule Activity Modal

```javascript
// src/components/ActivityModal/ActivityModal.jsx
import { useState } from "react";
import { useActivityTypes } from "../../hooks/useActivities";
import { useCreateActivity } from "../../hooks/useActivities";

export default function ActivityModal({ taskId, onClose }) {
  const { data: types = [] } = useActivityTypes("project.task");
  const create = useCreateActivity(taskId);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    activity_type_id: "",
    summary: "",
    date_deadline: today,
    note: "",
  });

  const handleSubmit = () => {
    if (!form.activity_type_id || !form.date_deadline) return;
    create.mutate({
      ...form,
      activity_type_id: parseInt(form.activity_type_id),
      res_model: "project.task",
      res_id: taskId,
    }, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Schedule Activity</h2>

        {/* Activity Type */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Activity Type</label>
          <select
            value={form.activity_type_id}
            onChange={(e) => setForm({ ...form, activity_type_id: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select type…</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Summary</label>
          <input
            type="text"
            placeholder="e.g. Follow up with Monica"
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Due Date */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Due Date</label>
          <input
            type="date"
            value={form.date_deadline}
            onChange={(e) => setForm({ ...form, date_deadline: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {/* Note */}
        <div>
          <label className="block text-sm text-gray-600 mb-1">Note</label>
          <textarea
            rows={3}
            placeholder="Additional details…"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 8. `state` Field Reference

`state` is computed on-the-fly from `date_deadline` vs today. It drives icon colour on the Kanban card.

| Value | Meaning | Icon Colour |
|---|---|---|
| `overdue` | `date_deadline < today` | 🔴 Red |
| `today` | `date_deadline = today` | 🟠 Orange |
| `planned` | `date_deadline > today` | 🟢 Green |

Since `state` is computed, **never use it in a domain filter** — use `date_deadline` comparisons instead (see Section 3.2 ViewSet list method).

---

## 9. Domain Filter Reference

```python
# All open activities on a task
[["res_model", "=", "project.task"], ["res_id", "=", task_id], ["active", "=", True]]

# All open activities on a project
[["res_model", "=", "project.project"], ["res_id", "=", project_id], ["active", "=", True]]

# Overdue activities (deadline passed)
[["date_deadline", "<", date.today().isoformat()], ["active", "=", True]]

# Today's activities for current user
[
    ["user_id", "=", uid],
    ["date_deadline", "=", date.today().isoformat()],
    ["active", "=", True],
]

# All open activities for current user (To-Do list)
[["user_id", "=", uid], ["active", "=", True]]

# Completed activities (active=False = done or cancelled)
[["res_model", "=", "project.task"], ["res_id", "=", task_id], ["active", "=", False]]

# Activities of a specific type on tasks
[
    ["res_model", "=", "project.task"],
    ["activity_type_id.name", "=", "Call"],
    ["active", "=", True],
]
```

---

## 10. Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| `active=True` are OPEN, `active=False` are DONE | Unlike most Odoo models where `active=False` means archived, for `mail.activity` it means the activity was completed or cancelled | Always filter `["active", "=", True]` when fetching open activities — omitting it returns both open AND done activities |
| Never filter by `state` in domain | `state` is computed (`overdue`/`today`/`planned`) and cannot be used in `search_read` domain — Odoo raises an error | Use `date_deadline` comparisons in the domain — the ViewSet list method shows the correct pattern |
| `action_feedback` vs `write(active=False)` | You can mark an activity done by writing `active=False`, but this skips writing feedback to the chatter and skips auto-chaining the next activity | Always use `action_feedback()` via the `/done/` endpoint — never write `active=False` directly |
| `res_id` is a `many2one_reference` | In `search_read` results, `res_id` comes back as a plain integer (not `[id, name]` like normal many2one). Don't try to access `res_id[0]` — it's already the int | Use `activity.res_id` directly as the linked record ID |
| Activity types are global — cache them | There are typically 5–10 activity types and they never change during normal use | Fetch once on app load with `staleTime: 5 * 60_000` — don't fetch on every modal open |
| `mark_done_and_schedule` needs the done activity's res_id | The `/done-and-schedule/` endpoint reads `res_model` and `res_id` from the activity being marked done — so the activity must exist in Odoo at that point | Call `/done/` first, then create the next activity — or use the combined endpoint which reads the record before marking done |
| Automated activities (`automated=True`) | These are created by automation rules and Odoo Studio — they may not be deletable by normal users | Check `can_write` before showing edit/cancel buttons on automated activities |
| `summary` shows on Kanban card, `note` does not | The `summary` field (short char) is the tooltip text on the activity icon. `note` (html) is only visible inside the activity popup | Keep `summary` concise (< 60 chars) — it's the only text visible at-a-glance |
