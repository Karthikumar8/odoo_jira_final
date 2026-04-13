# Skill: `project.milestone` — Antigravity

**Odoo model**: `project.milestone`  
**CSV source**: `edu-primesoft` — 39 fields verified (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC  
**Prerequisite**: `allow_milestones=True` must be set on `project.project` before milestones appear.

---

## 1. What a Milestone Is in Odoo

A milestone is a named deadline checkpoint inside a project. Key behaviours from the videos:

- Multiple tasks can be linked to one milestone via `task.milestone_id`
- Marking a milestone "Reached" (`is_reached=True`) can auto-trigger a Sales Order invoice (if `billing_type=milestones`)
- `quantity_percentage` controls what % of the SO line quantity is invoiced when this milestone is reached
- The project dashboard shows a progress bar: reached milestones / total milestones
- Overdue unreached milestones trigger `is_deadline_exceeded=True` (orange warning on the project card)

---

## 2. Field Reference Table

`store=True` = stored in PostgreSQL — safe in bulk `search_read`.  
`store=False` = computed — fetch only for single-record detail views.

### 2.1 Identity & Core

| Odoo Field | Label | Type | store | required | readonly | Notes |
|---|---|---|---|---|---|---|
| `id` | ID | integer | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Name | char | ✅ | ✅ | ❌ | Milestone title — required |
| `sequence` | Sequence | integer | ✅ | ❌ | ❌ | Display order within project |
| `deadline` | Deadline | date | ✅ | ❌ | ❌ | Target completion date |
| `is_reached` | Reached | boolean | ✅ | ❌ | ❌ | True = milestone marked done (green) |
| `reached_date` | Reached Date | date | ✅ | ❌ | ✅ | Auto-set when `is_reached` flipped to True |
| `display_name` | Display Name | char | ❌ | ❌ | ✅ | Computed — use `name` |

### 2.2 Project Relationship

| Odoo Field | Label | Type | Relation | store | required | Notes |
|---|---|---|---|---|---|---|
| `project_id` | Project | many2one | `project.project` | ✅ | ✅ | Parent project — required on create |
| `project_partner_id` | Customer | many2one | `res.partner` | ❌ | ✅ | Computed from `project_id.partner_id` |
| `project_allow_milestones` | Project Allow Milestones | boolean | ❌ | ❌ | ✅ | Computed — True if project has milestones enabled |

### 2.3 Tasks

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `task_ids` | Tasks | one2many | `project.task` | ✅ | All tasks linked to this milestone |
| `task_count` | # of Tasks | integer | ❌ | ❌ | Computed total count |
| `done_task_count` | # of Done Tasks | integer | ❌ | ❌ | Computed count of done/cancelled tasks |

### 2.4 Sales & Invoicing

| Odoo Field | Label | Type | Relation | store | readonly | Notes |
|---|---|---|---|---|---|---|
| `sale_line_id` | Sales Order Item | many2one | `sale.order.line` | ✅ | ❌ | Links milestone to a specific SO line for invoicing |
| `quantity_percentage` | Quantity (%) | float | ✅ | ✅ | ✅ | Computed — % of SO line quantity invoiced on reaching this milestone |
| `product_uom_qty` | Quantity | float | ❌ | ❌ | ❌ | Manual quantity override |
| `product_uom_id` | Unit | many2one | `uom.uom` | ❌ | ✅ | Computed UOM |
| `allow_billable` | Billable | boolean | ❌ | ❌ | ✅ | Computed from project |
| `sale_line_display_name` | Sale Line Display Name | char | ❌ | ❌ | ✅ | Computed display string |

### 2.5 Status / Warnings

| Odoo Field | Label | Type | store | readonly | Notes |
|---|---|---|---|---|---|
| `is_deadline_exceeded` | Is Deadline Exceeded | boolean | ❌ | ✅ | True if `deadline < today` and `is_reached=False` |
| `is_deadline_future` | Is Deadline Future | boolean | ❌ | ✅ | True if `deadline > today` |
| `can_be_marked_as_done` | Can Be Marked As Done | boolean | ❌ | ✅ | Computed permission — True when all tasks are done |

### 2.6 Messages & Followers (Chatter)

| Odoo Field | Label | Type | Relation | store | Notes |
|---|---|---|---|---|---|
| `message_ids` | Messages | one2many | `mail.message` | ✅ | Chatter log |
| `message_follower_ids` | Followers | one2many | `mail.followers` | ✅ | |
| `message_partner_ids` | Followers (Partners) | many2many | `res.partner` | ❌ | Computed |
| `message_is_follower` | Is Follower | boolean | ❌ | ❌ | Current user follows? |
| `message_needaction` | Action Needed | boolean | ❌ | ❌ | Unread chatter? |
| `message_needaction_counter` | # Actions | integer | ❌ | ❌ | |
| `message_has_error` | Delivery Error | boolean | ❌ | ❌ | |
| `message_has_sms_error` | SMS Error | boolean | ❌ | ❌ | |
| `message_attachment_count` | Attachment Count | integer | ❌ | ❌ | |
| `has_message` | Has Message | boolean | ❌ | ❌ | |
| `website_message_ids` | Website Messages | one2many | `mail.message` | ✅ | |
| `rating_ids` | Ratings | one2many | `rating.rating` | ✅ | Customer rating records |

### 2.7 System Fields

| Odoo Field | Label | Type | Relation | store | readonly |
|---|---|---|---|---|---|
| `create_date` | Created on | datetime | — | ✅ | ✅ |
| `write_date` | Last Updated on | datetime | — | ✅ | ✅ |
| `create_uid` | Created by | many2one | `res.users` | ✅ | ✅ |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | ✅ |

---

## 3. Field Sets for Odoo API Calls

```python
# apps/milestones/constants.py

MILESTONE_LIST_FIELDS = [
    "id",
    "name",
    "sequence",
    "deadline",
    "is_reached",
    "reached_date",
    "project_id",
    "task_ids",
    "sale_line_id",
    "quantity_percentage",
    "allow_billable",
]
# All store=True — safe in bulk search_read.

MILESTONE_DETAIL_FIELDS = MILESTONE_LIST_FIELDS + [
    "task_count",           # computed — only fetch for detail view
    "done_task_count",
    "is_deadline_exceeded",
    "is_deadline_future",
    "can_be_marked_as_done",
    "project_partner_id",
    "sale_line_display_name",
    "product_uom_qty",
    "product_uom_id",
    "message_ids",
    "message_follower_ids",
    "message_is_follower",
    "message_needaction",
    "message_attachment_count",
    "rating_ids",
    "write_date",
    "create_uid",
]
```

---

## 4. Django DRF Implementation

### 4.1 Serializer

```python
# apps/milestones/serializers.py
from rest_framework import serializers


class MilestoneSerializer(serializers.Serializer):
    # Core
    name                = serializers.CharField(max_length=255)
    sequence            = serializers.IntegerField(default=10)
    deadline            = serializers.DateField(required=False, allow_null=True)
    is_reached          = serializers.BooleanField(default=False)

    # Project — required on create, optional on patch
    project_id          = serializers.IntegerField(required=False)

    # Sales
    sale_line_id        = serializers.IntegerField(required=False, allow_null=True)
    product_uom_qty     = serializers.FloatField(required=False, allow_null=True)
```

### 4.2 ViewSet

```python
# apps/milestones/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import MilestoneSerializer
from .constants import MILESTONE_LIST_FIELDS, MILESTONE_DETAIL_FIELDS


class MilestoneViewSet(ViewSet):

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/milestones/
        Query params:
          ?project_id=<id>        required — always filter by project
          ?is_reached=true|false  filter by reached status
          ?order=deadline asc     default ordering
        """
        params = request.query_params
        domain = []

        if params.get("project_id"):
            domain.append(["project_id", "=", int(params["project_id"])])

        if params.get("is_reached") == "true":
            domain.append(["is_reached", "=", True])
        elif params.get("is_reached") == "false":
            domain.append(["is_reached", "=", False])

        order = params.get("order", "sequence asc, deadline asc")

        milestones = odoo_call(
            "project.milestone", "search_read",
            [domain],
            {"fields": MILESTONE_LIST_FIELDS, "order": order}
        )
        return Response(milestones)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/milestones/{id}/"""
        result = odoo_call(
            "project.milestone", "read",
            [[int(pk)]],
            {"fields": MILESTONE_DETAIL_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """
        POST /api/milestones/
        Body: { "name": "Phase 1", "project_id": 5, "deadline": "2026-06-30" }
        """
        serializer = MilestoneSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_id = odoo_call(
            "project.milestone", "create",
            [serializer.validated_data]
        )
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """PATCH /api/milestones/{id}/"""
        serializer = MilestoneSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        odoo_call(
            "project.milestone", "write",
            [[int(pk)], serializer.validated_data]
        )
        return Response({"id": int(pk)})

    # ── Delete ────────────────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/milestones/{id}/
        Milestones can be unlinked safely if no SO invoicing is tied to them.
        If sale_line_id is set, unlink will fail — warn the user first.
        """
        odoo_call("project.milestone", "unlink", [[int(pk)]])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Custom Actions ────────────────────────────────────────────

    @action(detail=True, methods=["patch"], url_path="reach")
    def reach(self, request, pk=None):
        """
        PATCH /api/milestones/{id}/reach/
        Marks the milestone as reached. Odoo auto-sets reached_date=today.
        If sale_line_id is set, this also updates the SO delivered quantity.
        """
        odoo_call(
            "project.milestone", "write",
            [[int(pk)], {"is_reached": True}]
        )
        # Re-fetch to get the auto-set reached_date and quantity_percentage
        result = odoo_call(
            "project.milestone", "read",
            [[int(pk)]],
            {"fields": MILESTONE_LIST_FIELDS}
        )
        return Response(result[0] if result else {"id": int(pk), "is_reached": True})

    @action(detail=True, methods=["patch"], url_path="unreach")
    def unreach(self, request, pk=None):
        """
        PATCH /api/milestones/{id}/unreach/
        Reverts a milestone back to unreached. Clears reached_date.
        """
        odoo_call(
            "project.milestone", "write",
            [[int(pk)], {"is_reached": False}]
        )
        return Response({"id": int(pk), "is_reached": False, "reached_date": False})

    @action(detail=False, methods=["get"], url_path="overdue")
    def overdue(self, request):
        """
        GET /api/milestones/overdue/?project_id=<id>
        Milestones past their deadline that haven't been reached yet.
        Used for the warning indicator on the project card.
        """
        params = request.query_params
        domain = [
            ["is_reached", "=", False],
            ["deadline", "!=", False],
        ]
        if params.get("project_id"):
            domain.append(["project_id", "=", int(params["project_id"])])

        # Odoo evaluates is_deadline_exceeded server-side via domain on date
        # We filter by deadline < today using Odoo's date comparison
        from datetime import date
        domain.append(["deadline", "<", date.today().isoformat()])

        milestones = odoo_call(
            "project.milestone", "search_read",
            [domain],
            {"fields": MILESTONE_LIST_FIELDS, "order": "deadline asc"}
        )
        return Response(milestones)
```

### 4.3 URL Configuration

```python
# apps/milestones/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MilestoneViewSet

router = DefaultRouter()
router.register(r"milestones", MilestoneViewSet, basename="milestone")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/milestones/?project_id={id}
# POST   /api/milestones/
# GET    /api/milestones/{id}/
# PATCH  /api/milestones/{id}/
# DELETE /api/milestones/{id}/
# PATCH  /api/milestones/{id}/reach/
# PATCH  /api/milestones/{id}/unreach/
# GET    /api/milestones/overdue/?project_id={id}
```

---

## 5. React API Layer

```javascript
// src/api/milestones.js
import client from "./client";

export const getMilestones = (projectId, params = {}) =>
  client
    .get("/milestones/", { params: { project_id: projectId, ...params } })
    .then((r) => r.data);
// params: { is_reached: "true"|"false", order: "deadline asc" }

export const getMilestone = (id) =>
  client.get(`/milestones/${id}/`).then((r) => r.data);

export const createMilestone = (data) =>
  client.post("/milestones/", data).then((r) => r.data);
// data: { name, project_id, deadline, sale_line_id? }

export const updateMilestone = (id, data) =>
  client.patch(`/milestones/${id}/`, data).then((r) => r.data);

export const deleteMilestone = (id) =>
  client.delete(`/milestones/${id}/`).then((r) => r.data);

export const reachMilestone = (id) =>
  client.patch(`/milestones/${id}/reach/`).then((r) => r.data);

export const unreachMilestone = (id) =>
  client.patch(`/milestones/${id}/unreach/`).then((r) => r.data);

export const getOverdueMilestones = (projectId) =>
  client
    .get("/milestones/overdue/", { params: { project_id: projectId } })
    .then((r) => r.data);
```

---

## 6. React Query Hooks

```javascript
// src/hooks/useMilestones.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/milestones";

// ── List ──────────────────────────────────────────────────────────
export const useMilestones = (projectId, params = {}) =>
  useQuery({
    queryKey: ["milestones", projectId, params],
    queryFn: () => api.getMilestones(projectId, params),
    enabled: !!projectId,
    staleTime: 30_000,
  });

// ── Overdue (for project card warning dot) ────────────────────────
export const useOverdueMilestones = (projectId) =>
  useQuery({
    queryKey: ["milestones", projectId, "overdue"],
    queryFn: () => api.getOverdueMilestones(projectId),
    enabled: !!projectId,
    staleTime: 60_000,
  });

// ── Detail ────────────────────────────────────────────────────────
export const useMilestone = (id) =>
  useQuery({
    queryKey: ["milestones", id],
    queryFn: () => api.getMilestone(id),
    enabled: !!id,
  });

// ── Create ────────────────────────────────────────────────────────
export const useCreateMilestone = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createMilestone,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
};

// ── Update ────────────────────────────────────────────────────────
export const useUpdateMilestone = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateMilestone(id, data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
};

// ── Reach (optimistic) ────────────────────────────────────────────
export const useReachMilestone = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.reachMilestone,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["milestones", projectId] });
      const prev = qc.getQueryData(["milestones", projectId]);
      qc.setQueryData(["milestones", projectId], (old) =>
        old?.map((m) =>
          m.id === id
            ? { ...m, is_reached: true, reached_date: new Date().toISOString().split("T")[0] }
            : m
        )
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      qc.setQueryData(["milestones", projectId], ctx.prev),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      // Also invalidate project dashboard — milestone_progress changes
      qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Unreach ───────────────────────────────────────────────────────
export const useUnreachMilestone = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.unreachMilestone,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones", projectId] });
      qc.invalidateQueries({ queryKey: ["projects", projectId, "dashboard"] });
    },
  });
};

// ── Delete ────────────────────────────────────────────────────────
export const useDeleteMilestone = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMilestone,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["milestones", projectId] }),
  });
};
```

---

## 7. Milestone Progress Bar Component

```javascript
// src/components/MilestoneBar/MilestoneBar.jsx
import { useMilestones } from "../../hooks/useMilestones";
import { useReachMilestone } from "../../hooks/useMilestones";

export default function MilestoneBar({ projectId }) {
  const { data: milestones = [] } = useMilestones(projectId);
  const reach = useReachMilestone(projectId);

  const total = milestones.length;
  const reached = milestones.filter((m) => m.is_reached).length;
  const pct = total > 0 ? Math.round((reached / total) * 100) : 0;

  if (total === 0) return null;

  return (
    <div className="space-y-2">
      {/* Progress bar header */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Milestones</span>
        <span>{reached}/{total} reached ({pct}%)</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-green-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Milestone list */}
      <ul className="space-y-1 mt-3">
        {milestones.map((m) => (
          <li key={m.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Reached toggle */}
              <button
                onClick={() => !m.is_reached && reach.mutate(m.id)}
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${m.is_reached
                    ? "bg-green-500 border-green-500 text-white"
                    : "border-gray-300 hover:border-green-400"
                  }`}
              >
                {m.is_reached && <span className="text-xs">✓</span>}
              </button>

              {/* Name + overdue warning */}
              <span className={`text-sm ${m.is_reached ? "line-through text-gray-400" : ""}`}>
                {m.name}
              </span>
            </div>

            {/* Deadline */}
            {m.deadline && (
              <span
                className={`text-xs ${
                  !m.is_reached && new Date(m.deadline) < new Date()
                    ? "text-red-500 font-medium"
                    : "text-gray-400"
                }`}
              >
                {m.deadline}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 8. Domain Filter Reference

```python
# All milestones for a project
[["project_id", "=", project_id]]

# Unreached milestones only
[["project_id", "=", project_id], ["is_reached", "=", False]]

# Reached milestones only
[["project_id", "=", project_id], ["is_reached", "=", True]]

# Overdue: deadline passed, not yet reached
[
    ["project_id", "=", project_id],
    ["is_reached", "=", False],
    ["deadline", "<", date.today().isoformat()],
    ["deadline", "!=", False],
]

# Milestones linked to a sales order line (invoicing milestones)
[["project_id", "=", project_id], ["sale_line_id", "!=", False]]

# Upcoming milestones (deadline in the future, not reached)
[
    ["project_id", "=", project_id],
    ["is_reached", "=", False],
    ["deadline", ">", date.today().isoformat()],
]
```

---

## 9. Invoicing via Milestones — How It Works End to End

This is the flow from Video 12 in the transcript. Understanding it is essential before building the milestone UI.

```
1. Project created with billing_type = "milestones" (on project.project)
   └── A Sales Order line exists: project.task.type → sale.order.line

2. Milestone created + linked to sale_line_id
   └── quantity_percentage auto-computed:
       e.g. 2 milestones → each gets 50%

3. All tasks linked to milestone are marked Done
   └── Odoo allows "Mark as Reached" (can_be_marked_as_done = True)

4. User marks milestone is_reached = True
   └── Odoo writes: reached_date = today
   └── SO line: qty_delivered updated by quantity_percentage
       e.g. 50% of 1 unit = 0.5 delivered

5. Customer invoice created from Sales Order
   └── Invoice line qty = sum of reached milestone percentages
   └── e.g. 2 of 4 milestones reached → invoice 50% of total
```

**Django implication**: After calling `/reach/`, always re-fetch both the milestone AND the project dashboard — `milestone_progress`, `analytic_account_balance`, and `invoice_count` all change.

---

## 10. Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| `allow_milestones` must be True on the project | Creating a milestone for a project where `allow_milestones=False` succeeds in the API but the milestone never appears in the Odoo UI | Check `project.allow_milestones` before showing the "Add Milestone" button in React |
| `reached_date` is read-only | You cannot set `reached_date` manually — Odoo sets it automatically when `is_reached` is flipped to True | Never include `reached_date` in a `write` payload. Use the `/reach/` endpoint which re-fetches the auto-set value |
| `quantity_percentage` is computed, not writable | It is automatically recalculated by Odoo based on how many milestones share the same `sale_line_id` | Never write `quantity_percentage` directly — it will be ignored |
| `can_be_marked_as_done` is not always True | Odoo only sets this to True when all linked tasks are in a done/cancelled state | In your React UI, disable the "Mark as Reached" button when `can_be_marked_as_done=False` — or fetch task completion status separately |
| `unlink` fails with SO invoicing | If `sale_line_id` is set and the milestone has been reached (SO quantity already delivered), Odoo will reject `unlink` | Check `sale_line_id` before showing "Delete" — show "Archive" instead if billing is linked |
| `project_id` required on create | The API will raise a `ValidationError` if `project_id` is missing | Always validate `project_id` in the serializer as required on create |
| Milestone progress invalidation | Reaching a milestone changes `milestone_progress` on `project.project` (computed). Your project card won't update unless you invalidate the project dashboard query | In `useReachMilestone.onSettled`, always invalidate `["projects", projectId, "dashboard"]` |
