# Skill: Stages — `project.task.type` + `project.project.stage`

**Critical distinction**: Odoo Project has TWO completely separate stage models. Most developers confuse them and break the Kanban on day 1.

| Model | What it is | Where it appears |
|---|---|---|
| `project.task.type` | **Task stage** — the Kanban columns inside a project | Task Kanban board columns (Ideas · In Progress · Review · Done) |
| `project.project.stage` | **Project stage** — the pipeline of projects themselves | Project list / Kanban (New · In Progress · Done · In Review) |

**CSV source**: `edu-primesoft` — `project.task.type` 23 fields · `project.project.stage` 14 fields (24,749-row export, 26 Mar 2026)  
**Stack**: Django DRF ViewSet → `odoo_call()` → Odoo XML-RPC

---

## Part A — `project.task.type` (Task Kanban Stages)

This is the model you interact with constantly. Every Kanban column is one record of `project.task.type`. A single stage can be shared across multiple projects (`project_ids` is many2many).

### A.1 Field Reference Table

All 23 fields — every field is `store=True` (safe in list calls).

| Odoo Field | Label | Type | Relation | store | required | readonly | Notes |
|---|---|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Name | char | — | ✅ | ✅ | ❌ | Column header label |
| `active` | Active | boolean | ✅ | ❌ | ❌ | False = archived stage |
| `sequence` | Sequence | integer | ✅ | ❌ | ❌ | Left-to-right column order |
| `fold` | Folded | boolean | ✅ | ❌ | ❌ | True = column collapsed in Kanban |
| `color` | Color | integer | ✅ | ❌ | ❌ | 0–11 color index |
| `project_ids` | Projects | many2many | `project.project` | ✅ | ❌ | ❌ | Projects that use this stage |
| `user_id` | Stage Owner | many2one | `res.users` | ✅ | ❌ | ✅ | Read-only — set by Odoo |
| `mail_template_id` | Email Template | many2one | `mail.template` | ✅ | ❌ | ❌ | Auto-email sent when task moves into this stage |
| `sms_template_id` | SMS Template | many2one | `sms.template` | ✅ | ❌ | ❌ | Auto-SMS on stage move |
| `auto_validation_state` | Automatic Kanban Status | boolean | ✅ | ❌ | ❌ | True = auto-set task `state` to `03_approved` when entering this stage |
| `rating_active` | Send Customer Rating Request | boolean | ✅ | ❌ | ❌ | True = send rating email when task enters this stage |
| `rating_status` | Customer Ratings Status | selection | ✅ | ✅ | ✅ | `no` · `stage` · `periodic` |
| `rating_status_period` | Rating Frequency | selection | ✅ | ✅ | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `yearly` — only applies when `rating_status=periodic` |
| `rating_template_id` | Rating Email Template | many2one | `mail.template` | ✅ | ❌ | ❌ | Custom rating email template |
| `rating_request_deadline` | Rating Request Deadline | datetime | ✅ | ❌ | ✅ | Read-only — computed |
| `rotting_threshold_days` | Days to Rot | integer | ✅ | ❌ | ❌ | Tasks unmoved for N days → `is_rotting=True` |
| `show_rating_active` | Show Rating Active | boolean | ❌ | ❌ | ✅ | Computed display flag |
| `display_name` | Display Name | char | ❌ | ❌ | ✅ | Computed — use `name` instead |
| `create_date` | Created on | datetime | ✅ | ❌ | ✅ | System |
| `write_date` | Last Updated on | datetime | ✅ | ❌ | ✅ | System |
| `create_uid` | Created by | many2one | `res.users` | ✅ | ❌ | ✅ | System |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | ❌ | ✅ | System |

### A.2 `rating_status` Selection Values

| Value | Meaning |
|---|---|
| `no` | No rating requests |
| `stage` | Send rating email once when task enters this stage |
| `periodic` | Send rating emails on a schedule (`rating_status_period` sets frequency) |

### A.3 Field Sets

```python
# apps/stages/constants.py

STAGE_LIST_FIELDS = [
    "id",
    "name",
    "active",
    "sequence",
    "fold",
    "color",
    "project_ids",
    "mail_template_id",
    "sms_template_id",
    "auto_validation_state",
    "rating_active",
    "rating_status",
    "rating_status_period",
    "rating_template_id",
    "rotting_threshold_days",
    "user_id",
]
# All 23 fields are store=True — safe to request all in every call.
# No separate DETAIL_FIELDS needed for this model.
```

### A.4 Django DRF Implementation

```python
# apps/stages/serializers.py
from rest_framework import serializers


class StageSerializer(serializers.Serializer):
    name                  = serializers.CharField(max_length=255)
    active                = serializers.BooleanField(default=True)
    sequence              = serializers.IntegerField(default=10)
    fold                  = serializers.BooleanField(default=False)
    color                 = serializers.IntegerField(min_value=0, max_value=11, default=0)

    # Many2many — which projects use this stage
    project_ids           = serializers.ListField(
        child=serializers.IntegerField(), required=False
    )

    # Email/SMS on stage move
    mail_template_id      = serializers.IntegerField(required=False, allow_null=True)
    sms_template_id       = serializers.IntegerField(required=False, allow_null=True)

    # Kanban auto-status
    auto_validation_state = serializers.BooleanField(default=False)

    # Customer ratings
    rating_active         = serializers.BooleanField(default=False)
    rating_status         = serializers.ChoiceField(
        choices=["no", "stage", "periodic"], default="no"
    )
    rating_status_period  = serializers.ChoiceField(
        choices=["daily", "weekly", "monthly", "quarterly", "yearly"],
        required=False
    )
    rating_template_id    = serializers.IntegerField(required=False, allow_null=True)

    # Rotting
    rotting_threshold_days = serializers.IntegerField(required=False, allow_null=True)

    def to_odoo(self, validated_data: dict) -> dict:
        payload = dict(validated_data)
        if "project_ids" in payload:
            payload["project_ids"] = [(6, 0, payload["project_ids"])]
        return payload
```

```python
# apps/stages/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import StageSerializer
from .constants import STAGE_LIST_FIELDS


class StageViewSet(ViewSet):

    # ── List ──────────────────────────────────────────────────────
    def list(self, request):
        """
        GET /api/stages/
        Query params:
          ?project_id=<id>   filter stages belonging to a project (most common)
          ?active=true|false (default: true)

        IMPORTANT: Always filter by project_id. Fetching all stages globally
        returns stages from ALL projects — not useful for the Kanban board.
        """
        params = request.query_params
        domain = []

        if params.get("project_id"):
            domain.append(["project_ids", "in", [int(params["project_id"])]])

        active_param = params.get("active", "true")
        if active_param == "true":
            domain.append(["active", "=", True])
        elif active_param == "false":
            domain.append(["active", "=", False])

        stages = odoo_call(
            "project.task.type", "search_read",
            [domain],
            {"fields": STAGE_LIST_FIELDS, "order": "sequence asc"}
        )
        return Response(stages)

    # ── Retrieve ──────────────────────────────────────────────────
    def retrieve(self, request, pk=None):
        """GET /api/stages/{id}/"""
        result = odoo_call(
            "project.task.type", "read",
            [[int(pk)]],
            {"fields": STAGE_LIST_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    # ── Create ────────────────────────────────────────────────────
    def create(self, request):
        """
        POST /api/stages/
        Always include project_ids so the stage is linked to the project.
        Body: { "name": "In Review", "project_ids": [5], "sequence": 30 }
        """
        serializer = StageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        new_id = odoo_call("project.task.type", "create", [payload])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    # ── Update ────────────────────────────────────────────────────
    def partial_update(self, request, pk=None):
        """PATCH /api/stages/{id}/"""
        serializer = StageSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        payload = serializer.to_odoo(serializer.validated_data)
        odoo_call("project.task.type", "write", [[int(pk)], payload])
        return Response({"id": int(pk)})

    # ── Delete (Archive) ──────────────────────────────────────────
    def destroy(self, request, pk=None):
        """
        DELETE /api/stages/{id}/
        Archive instead of unlink — a stage shared across projects
        cannot be unlinked if other projects still use it.
        """
        odoo_call("project.task.type", "write",
                  [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    # ── Custom Actions ────────────────────────────────────────────

    @action(detail=True, methods=["patch"], url_path="reorder")
    def reorder(self, request, pk=None):
        """
        PATCH /api/stages/{id}/reorder/
        Body: { "sequence": 20 }
        Moves the column left/right in the Kanban board.
        """
        sequence = request.data.get("sequence")
        if sequence is None:
            return Response({"detail": "sequence required"}, status=400)
        odoo_call("project.task.type", "write",
                  [[int(pk)], {"sequence": int(sequence)}])
        return Response({"id": int(pk), "sequence": int(sequence)})

    @action(detail=True, methods=["patch"], url_path="fold")
    def toggle_fold(self, request, pk=None):
        """
        PATCH /api/stages/{id}/fold/
        Body: { "fold": true }
        Collapses or expands the Kanban column.
        """
        fold = request.data.get("fold")
        if fold is None:
            return Response({"detail": "fold required"}, status=400)
        odoo_call("project.task.type", "write",
                  [[int(pk)], {"fold": bool(fold)}])
        return Response({"id": int(pk), "fold": bool(fold)})

    @action(detail=False, methods=["post"], url_path="reorder-bulk")
    def reorder_bulk(self, request):
        """
        POST /api/stages/reorder-bulk/
        Body: [{ "id": 3, "sequence": 10 }, { "id": 7, "sequence": 20 }, ...]
        Drag-and-drop column reorder — update all sequences in one round trip.
        """
        items = request.data
        if not isinstance(items, list):
            return Response({"detail": "Expected a list."}, status=400)
        for item in items:
            odoo_call("project.task.type", "write",
                      [[int(item["id"])], {"sequence": int(item["sequence"])}])
        return Response({"updated": len(items)})
```

```python
# apps/stages/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StageViewSet

router = DefaultRouter()
router.register(r"stages", StageViewSet, basename="stage")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/stages/?project_id={id}
# POST   /api/stages/
# GET    /api/stages/{id}/
# PATCH  /api/stages/{id}/
# DELETE /api/stages/{id}/
# PATCH  /api/stages/{id}/reorder/
# PATCH  /api/stages/{id}/fold/
# POST   /api/stages/reorder-bulk/
```

### A.5 React API Layer

```javascript
// src/api/stages.js
import client from "./client";

export const getStages = (projectId) =>
  client.get("/stages/", { params: { project_id: projectId } }).then((r) => r.data);

export const createStage = (data) =>
  client.post("/stages/", data).then((r) => r.data);
// data: { name: "In Review", project_ids: [5], sequence: 30 }

export const updateStage = (id, data) =>
  client.patch(`/stages/${id}/`, data).then((r) => r.data);

export const deleteStage = (id) =>
  client.delete(`/stages/${id}/`).then((r) => r.data);

export const reorderStage = (id, sequence) =>
  client.patch(`/stages/${id}/reorder/`, { sequence }).then((r) => r.data);

export const foldStage = (id, fold) =>
  client.patch(`/stages/${id}/fold/`, { fold }).then((r) => r.data);

export const reorderStagesBulk = (items) =>
  client.post("/stages/reorder-bulk/", items).then((r) => r.data);
// items: [{ id: 3, sequence: 10 }, { id: 7, sequence: 20 }]
```

### A.6 React Query Hooks

```javascript
// src/hooks/useStages.js
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api/stages";

// ── Fetch stages for a project ────────────────────────────────────
export const useStages = (projectId) =>
  useQuery({
    queryKey: ["stages", projectId],
    queryFn: () => api.getStages(projectId),
    enabled: !!projectId,
    staleTime: 60_000, // Stages change rarely — cache for 60s
  });

// ── Fold/unfold column (optimistic) ──────────────────────────────
export const useFoldStage = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fold }) => api.foldStage(id, fold),
    onMutate: async ({ id, fold }) => {
      await qc.cancelQueries({ queryKey: ["stages", projectId] });
      const prev = qc.getQueryData(["stages", projectId]);
      qc.setQueryData(["stages", projectId], (old) =>
        old?.map((s) => (s.id === id ? { ...s, fold } : s))
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      qc.setQueryData(["stages", projectId], ctx.prev),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["stages", projectId] }),
  });
};

// ── Bulk reorder columns (after drag-drop) ────────────────────────
export const useReorderStages = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items) => api.reorderStagesBulk(items),
    onMutate: async (items) => {
      await qc.cancelQueries({ queryKey: ["stages", projectId] });
      const prev = qc.getQueryData(["stages", projectId]);
      const seqMap = Object.fromEntries(items.map((i) => [i.id, i.sequence]));
      qc.setQueryData(["stages", projectId], (old) =>
        old
          ?.map((s) => ({ ...s, sequence: seqMap[s.id] ?? s.sequence }))
          .sort((a, b) => a.sequence - b.sequence)
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) =>
      qc.setQueryData(["stages", projectId], ctx.prev),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: ["stages", projectId] }),
  });
};

// ── Create stage ──────────────────────────────────────────────────
export const useCreateStage = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.createStage({ ...data, project_ids: [projectId] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", projectId] }),
  });
};

// ── Update stage ──────────────────────────────────────────────────
export const useUpdateStage = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => api.updateStage(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", projectId] }),
  });
};

// ── Delete stage ──────────────────────────────────────────────────
export const useDeleteStage = (projectId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.deleteStage(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["stages", projectId] }),
  });
};
```

### A.7 Kanban Board Integration Pattern

This is how `useStages` and `useTasks` wire together to build the full Kanban board:

```javascript
// src/pages/ProjectDetail/TaskKanban/TaskKanban.jsx
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useStages } from "../../../hooks/useStages";
import { useTasks } from "../../../hooks/useTasks";
import { useMoveTask, useReorderStages } from "../../../hooks/useTasks";
import StageColumn from "../../../components/StageColumn/StageColumn";

export default function TaskKanban({ projectId }) {
  const { data: stages = [] } = useStages(projectId);
  const { data: tasks = [] } = useTasks({ project_id: projectId, view: "kanban" });
  const moveTask = useMoveTask();
  const reorderStages = useReorderStages(projectId);

  // Group tasks by stage_id
  const tasksByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = tasks.filter((t) => t.stage_id?.[0] === stage.id);
    return acc;
  }, {});

  const onDragEnd = (result) => {
    const { draggableId, destination, source, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId &&
        destination.index === source.index) return;

    if (type === "COLUMN") {
      // Stage column reorder
      const reordered = Array.from(stages);
      const [moved] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, moved);
      const items = reordered.map((s, i) => ({ id: s.id, sequence: (i + 1) * 10 }));
      reorderStages.mutate(items);
      return;
    }

    // Task card move between columns
    const taskId = parseInt(draggableId);
    const newStageId = parseInt(destination.droppableId);
    moveTask.mutate({ id: taskId, stageId: newStageId });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex gap-4 overflow-x-auto p-4"
          >
            {stages.map((stage, index) => (
              <Draggable
                key={stage.id}
                draggableId={String(stage.id)}
                index={index}
              >
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.draggableProps}>
                    <StageColumn
                      stage={stage}
                      tasks={tasksByStage[stage.id] ?? []}
                      dragHandleProps={provided.dragHandleProps}
                      projectId={projectId}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### A.8 Domain Filter Reference

```python
# Stages for a specific project (most common — always use this)
[["project_ids", "in", [project_id]], ["active", "=", True]]

# Folded stages only (Done/Cancelled columns)
[["project_ids", "in", [project_id]], ["fold", "=", True]]

# Stages with customer rating enabled
[["project_ids", "in", [project_id]], ["rating_active", "=", True]]

# Stages with email template on move
[["project_ids", "in", [project_id]], ["mail_template_id", "!=", False]]

# All stages ordered for Kanban (always include order)
# → use {"order": "sequence asc"} in search_read kwargs
```

---

## Part B — `project.project.stage` (Project Pipeline Stages)

This model is simpler — 14 fields, all `store=True`. It represents the pipeline columns when viewing **projects themselves** in Kanban (New · In Progress · Done · In Review · Consult). It is completely separate from `project.task.type`.

### B.1 Field Reference Table

| Odoo Field | Label | Type | Relation | store | required | readonly | Notes |
|---|---|---|---|---|---|---|---|
| `id` | ID | integer | — | ✅ | ✅ | ✅ | Auto-assigned |
| `name` | Name | char | — | ✅ | ✅ | ❌ | Pipeline stage label |
| `active` | Active | boolean | ✅ | ❌ | ❌ | False = archived |
| `sequence` | Sequence | integer | ✅ | ❌ | ❌ | Left-to-right order |
| `fold` | Folded | boolean | ✅ | ❌ | ❌ | Collapsed in Kanban |
| `color` | Color | integer | ✅ | ❌ | ❌ | 0–11 color index |
| `company_id` | Company | many2one | `res.company` | ✅ | ❌ | ❌ | Multi-company support |
| `mail_template_id` | Email Template | many2one | `mail.template` | ✅ | ❌ | ❌ | Email sent when project moves to this stage |
| `sms_template_id` | SMS Template | many2one | `sms.template` | ✅ | ❌ | ❌ | SMS on project stage move |
| `display_name` | Display Name | char | ❌ | ❌ | ✅ | Computed — use `name` |
| `create_date` | Created on | datetime | ✅ | ❌ | ✅ | System |
| `write_date` | Last Updated on | datetime | ✅ | ❌ | ✅ | System |
| `create_uid` | Created by | many2one | `res.users` | ✅ | ❌ | ✅ | System |
| `write_uid` | Last Updated by | many2one | `res.users` | ✅ | ❌ | ✅ | System |

### B.2 Field Set

```python
# apps/project_stages/constants.py
PROJECT_STAGE_FIELDS = [
    "id",
    "name",
    "active",
    "sequence",
    "fold",
    "color",
    "company_id",
    "mail_template_id",
    "sms_template_id",
]
```

### B.3 Django DRF Implementation

```python
# apps/project_stages/serializers.py
from rest_framework import serializers


class ProjectStageSerializer(serializers.Serializer):
    name             = serializers.CharField(max_length=255)
    active           = serializers.BooleanField(default=True)
    sequence         = serializers.IntegerField(default=10)
    fold             = serializers.BooleanField(default=False)
    color            = serializers.IntegerField(min_value=0, max_value=11, default=0)
    company_id       = serializers.IntegerField(required=False, allow_null=True)
    mail_template_id = serializers.IntegerField(required=False, allow_null=True)
    sms_template_id  = serializers.IntegerField(required=False, allow_null=True)
```

```python
# apps/project_stages/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status

from services.odoo_client import odoo_call
from .serializers import ProjectStageSerializer
from .constants import PROJECT_STAGE_FIELDS


class ProjectStageViewSet(ViewSet):

    def list(self, request):
        """GET /api/project-stages/ — all active project pipeline stages"""
        domain = [["active", "=", True]]
        stages = odoo_call(
            "project.project.stage", "search_read",
            [domain],
            {"fields": PROJECT_STAGE_FIELDS, "order": "sequence asc"}
        )
        return Response(stages)

    def retrieve(self, request, pk=None):
        """GET /api/project-stages/{id}/"""
        result = odoo_call(
            "project.project.stage", "read",
            [[int(pk)]],
            {"fields": PROJECT_STAGE_FIELDS}
        )
        if not result:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result[0])

    def create(self, request):
        """POST /api/project-stages/"""
        serializer = ProjectStageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_id = odoo_call(
            "project.project.stage", "create",
            [serializer.validated_data]
        )
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        """PATCH /api/project-stages/{id}/"""
        serializer = ProjectStageSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        odoo_call("project.project.stage", "write",
                  [[int(pk)], serializer.validated_data])
        return Response({"id": int(pk)})

    def destroy(self, request, pk=None):
        """DELETE /api/project-stages/{id}/ — archive"""
        odoo_call("project.project.stage", "write",
                  [[int(pk)], {"active": False}])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="reorder-bulk")
    def reorder_bulk(self, request):
        """
        POST /api/project-stages/reorder-bulk/
        Body: [{ "id": 1, "sequence": 10 }, { "id": 2, "sequence": 20 }]
        """
        for item in request.data:
            odoo_call("project.project.stage", "write",
                      [[int(item["id"])], {"sequence": int(item["sequence"])}])
        return Response({"updated": len(request.data)})
```

```python
# apps/project_stages/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectStageViewSet

router = DefaultRouter()
router.register(r"project-stages", ProjectStageViewSet, basename="project-stage")

urlpatterns = [path("", include(router.urls))]

# Registered routes:
# GET    /api/project-stages/
# POST   /api/project-stages/
# GET    /api/project-stages/{id}/
# PATCH  /api/project-stages/{id}/
# DELETE /api/project-stages/{id}/
# POST   /api/project-stages/reorder-bulk/
```

### B.4 React API Layer

```javascript
// src/api/projectStages.js
import client from "./client";

export const getProjectStages = () =>
  client.get("/project-stages/").then((r) => r.data);

export const createProjectStage = (data) =>
  client.post("/project-stages/", data).then((r) => r.data);

export const updateProjectStage = (id, data) =>
  client.patch(`/project-stages/${id}/`, data).then((r) => r.data);

export const deleteProjectStage = (id) =>
  client.delete(`/project-stages/${id}/`).then((r) => r.data);

export const reorderProjectStagesBulk = (items) =>
  client.post("/project-stages/reorder-bulk/", items).then((r) => r.data);
```

---

## Known Gotchas

| Gotcha | Explanation | Fix |
|---|---|---|
| Two completely different stage models | `project.task.type` = task Kanban columns. `project.project.stage` = project pipeline. They share similar field names (`name`, `fold`, `sequence`, `color`) which makes it easy to mix them up in code | Name your Django apps `stages` (for task type) and `project_stages` (for project stage) — never both `stages` |
| `project_ids` filter is mandatory for task stages | `search_read` on `project.task.type` without a `project_ids` domain returns stages from ALL projects in Odoo | Always pass `[["project_ids", "in", [project_id]]]` in the domain |
| Stage is shared across projects | A single `project.task.type` record can belong to multiple projects. Editing its name or email template affects ALL projects that share it | Warn the user before editing a shared stage; show `project_ids` count |
| `fold=True` does not prevent task creation | A folded column still accepts tasks — it's just visually collapsed. Do not filter out folded stages from your task fetch | Fetch all stages including folded; let the React column handle the collapsed UI |
| `auto_validation_state` side effect | When `auto_validation_state=True`, moving a task into this stage automatically sets `state="03_approved"`. Your React optimistic update for drag-drop must also update `state` | After `moveTask` resolves, re-fetch the task detail to get the auto-updated `state` value |
| Column reorder needs `sequence asc` | Odoo returns stages in insertion order without `order`. Always pass `"order": "sequence asc"` | It's baked into `STAGE_LIST_FIELDS` fetch in the ViewSet — don't remove it |
| `project.project.stage` has no `project_ids` | Unlike task stages, project pipeline stages are global (company-wide), not per-project. You don't filter by project — you just fetch all | Use `getProjectStages()` without any filter; they are shared across all projects |
| Deleting a stage with tasks | `unlink` on a stage that has tasks raises a Odoo `ValidationError`. Odoo forces you to move tasks first | Always archive (`active=False`) instead of `unlink`. Show a warning in React if `task_count > 0` before delete |
