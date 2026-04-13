# Architecture – Antigravity (Odoo Project Replica)

**Stack**: Django 5 + DRF · React 18 · Odoo XML-RPC External API  
**Data source**: Odoo cloud (`edu-primesoft`) — Antigravity never owns the DB.  
**API key**: `004f6869068950f9bde6cb60a2e32a325850ed91`

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (React 18)                        │
│  Kanban · List · Gantt · Calendar · Dashboard · Timer           │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS JSON (Axios)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Django 5 + DRF (Backend)                       │
│  /api/projects/   /api/tasks/   /api/timesheets/                │
│  /api/stages/     /api/milestones/   /api/updates/              │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              OdooClient (singleton service)             │     │
│  │  host  = https://edu-primesoft.odoo.com                │     │
│  │  db    = edu-primesoft                                  │     │
│  │  api_key = 004f6869068950f9bde6cb60a2e32a325850ed91   │     │
│  └──────────────────────┬─────────────────────────────────┘     │
└─────────────────────────┼───────────────────────────────────────┘
                          │ XML-RPC (port 443 / HTTPS)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              Odoo Cloud  (edu-primesoft.odoo.com)                │
│                                                                  │
│  project.project       project.task          project.milestone  │
│  project.task.type     project.update        project.tags       │
│  project.task.recurrence                     project.project.stage│
│  account.analytic.line (timesheets)                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Odoo XML-RPC Connection

Odoo exposes two XML-RPC endpoints. With an API key you skip password auth.

```python
# antigravity/services/odoo_client.py
import xmlrpc.client

ODOO_URL     = "https://edu-primesoft.odoo.com"
ODOO_DB      = "edu-primesoft"
ODOO_API_KEY = "004f6869068950f9bde6cb60a2e32a325850ed91"

# ── Authentication ────────────────────────────────────────────────
common = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/common")
uid    = common.authenticate(ODOO_DB, "your@email.com", ODOO_API_KEY, {})

# ── Data operations ───────────────────────────────────────────────
models = xmlrpc.client.ServerProxy(f"{ODOO_URL}/xmlrpc/2/object")

def odoo_call(model, method, args, kwargs=None):
    """Single entry point for every Odoo call in the backend."""
    return models.execute_kw(
        ODOO_DB, uid, ODOO_API_KEY,
        model, method, args, kwargs or {}
    )
```

### XML-RPC Method Reference

| Operation | XML-RPC method | Example |
|-----------|---------------|---------|
| Read list | `search_read` | list all tasks |
| Read one  | `read`        | task detail by id |
| Create    | `create`      | new task |
| Update    | `write`       | update task fields |
| Delete    | `unlink`      | delete task |
| Count     | `search_count`| total tasks in project |

---

## 3. Odoo Model → Django Proxy Model Map

Django models are **thin proxy shells** — they do NOT store data in a local DB. Every field below maps to the exact Odoo field name (from `edu-primesoft` CSV, 24,749 rows verified).

### 3.1 `project.project` → `Project`

```python
# These are the stored=True fields from your CSV — use them exactly as-is
# in search_read field lists so you never request a computed field by mistake.

PROJECT_FIELDS = [
    "id", "name", "active", "color",
    "partner_id",            # many2one → res.partner (Customer)
    "user_id",               # many2one → res.users  (Project Manager)
    "date_start",            # date
    "date",                  # date  (Expiration / Deadline)
    "description",           # html
    "privacy_visibility",    # selection: followers | employees | portal
    "allow_timesheets",      # boolean
    "allow_milestones",      # boolean
    "allow_recurring_tasks", # boolean
    "allow_task_dependencies",# boolean
    "allow_billable",        # boolean
    "billing_type",          # selection: task_rate | fixed_rate | employee_rate
    "allocated_hours",       # float
    "account_id",            # many2one → account.analytic.account
    "alias_name",            # char (email alias prefix)
    "last_update_status",    # selection: on_track | at_risk | off_track | on_hold
    "last_update_id",        # many2one → project.update
    "milestone_ids",         # one2many → project.milestone
    "is_template",           # boolean
    "tag_ids",               # many2many → project.tags
    "favorite_user_ids",     # many2many → res.users (Members)
]
```

### 3.2 `project.task` → `Task`

```python
TASK_FIELDS = [
    "id", "name", "active", "color",
    "project_id",            # many2one → project.project
    "stage_id",              # many2one → project.task.type  (Kanban stage)
    "user_ids",              # many2many → res.users (Assignees)
    "partner_id",            # many2one → res.partner
    "priority",              # selection: 0=normal | 1=starred
    "date_deadline",         # datetime
    "planned_date_begin",    # datetime (Start date)
    "date_end",              # datetime (Ending date — Gantt)
    "allocated_hours",       # float
    "effective_hours",       # float  (Time Spent — computed but stored)
    "remaining_hours",       # float
    "overtime",              # float
    "progress",              # float (0–100)
    "description",           # html
    "tag_ids",               # many2many → project.tags
    "parent_id",             # many2one → project.task (Parent / Subtask)
    "child_ids",             # one2many → project.task (Subtasks)
    "depend_on_ids",         # many2many → project.task (Blocked By)
    "dependent_ids",         # many2many → project.task (Blocks)
    "milestone_id",          # many2one → project.milestone
    "recurrence_id",         # many2one → project.task.recurrence
    "recurring_task",        # boolean
    "sale_line_id",          # many2one → sale.order.line
    "display_in_project",    # boolean
    "personal_stage_type_ids", # many2many → project.task.type (Personal stage)
    "activity_ids",          # one2many → mail.activity
    "rating_last_value",     # float  (Customer rating: 1=bad 5=ok 10=good)
    "access_token",          # char   (Portal share token)
]
```

### 3.3 `project.task.type` → `Stage` (Task Kanban stages)

```python
STAGE_FIELDS = [
    "id", "name", "sequence", "fold", "color",
    "project_ids",           # many2many → project.project
    "mail_template_id",      # many2one → mail.template (email on move)
    "sms_template_id",       # many2one → sms.template
    "auto_validation_state", # boolean (auto set kanban status)
    "rating_active",         # boolean
    "rating_template_id",    # many2one → mail.template
    "rating_status",         # selection
    "rating_status_period",  # selection: once | stage
    "rotting_threshold_days",# integer
]
```

### 3.4 `project.milestone` → `Milestone`

```python
MILESTONE_FIELDS = [
    "id", "name", "sequence",
    "project_id",            # many2one → project.project
    "deadline",              # date
    "is_reached",            # boolean
    "reached_date",          # date
    "quantity_percentage",   # float (% of SO line quantity on reach)
    "sale_line_id",          # many2one → sale.order.line
    "task_ids",              # one2many → project.task
]
```

### 3.5 `project.task.recurrence` → `Recurrence`

```python
RECURRENCE_FIELDS = [
    "id",
    "repeat_interval",       # integer (every N)
    "repeat_unit",           # selection: day | week | month | year
    "repeat_type",           # selection: forever | until
    "repeat_until",          # date (end date if repeat_type=until)
    "task_ids",              # one2many → project.task
]
```

### 3.6 `project.update` → `ProjectUpdate`

```python
UPDATE_FIELDS = [
    "id", "name", "date",
    "project_id",            # many2one → project.project
    "user_id",               # many2one → res.users (Author)
    "status",                # selection: on_track | at_risk | off_track | on_hold
    "progress",              # integer (0–100)
    "description",           # html
    "allocated_time",        # integer (hours)
    "task_count",            # integer
    "closed_task_count",     # integer
    "timesheet_time",        # integer (hours logged)
]
```

### 3.7 `account.analytic.line` → `Timesheet`

```python
TIMESHEET_FIELDS = [
    "id", "name", "date",
    "project_id",            # many2one → project.project
    "task_id",               # many2one → project.task
    "employee_id",           # many2one → hr.employee
    "user_id",               # many2one → res.users
    "unit_amount",           # float (hours logged — THE key field)
    "amount",                # monetary (cost)
    "so_line",               # many2one → sale.order.line
    "timesheet_invoice_id",  # many2one → account.move
    "parent_task_id",        # many2one → project.task
]
```

---

## 4. Django Project Structure

```
antigravity/
├── manage.py
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
│
├── services/
│   └── odoo_client.py          ← single OdooClient class (XML-RPC wrapper)
│
├── apps/
│   ├── projects/
│   │   ├── serializers.py      ← ProjectSerializer, StageSerializer
│   │   ├── views.py            ← ProjectViewSet, StageViewSet
│   │   └── urls.py
│   │
│   ├── tasks/
│   │   ├── serializers.py      ← TaskSerializer, RecurrenceSerializer
│   │   ├── views.py            ← TaskViewSet
│   │   └── urls.py
│   │
│   ├── milestones/
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   ├── timesheets/
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   └── updates/
│       ├── serializers.py
│       ├── views.py
│       └── urls.py
│
└── requirements.txt
```

> **No `models.py` in any app.** Django models are not used for data storage.  
> All apps import `OdooClient` from `services/odoo_client.py` and call Odoo directly.

---

## 5. DRF API Endpoint Map

Every endpoint below is a **pass-through proxy** to Odoo via XML-RPC.

```
# Projects
GET    /api/projects/                    → search_read project.project
POST   /api/projects/                    → create      project.project
GET    /api/projects/{id}/               → read        project.project [id]
PATCH  /api/projects/{id}/               → write       project.project [id]
DELETE /api/projects/{id}/               → write({"active": False})


# Stages (project.task.type)
GET    /api/stages/?project_id={id}      → search_read project.task.type
POST   /api/stages/                      → create      project.task.type
PATCH  /api/stages/{id}/                 → write       project.task.type [id]
PATCH  /api/stages/{id}/reorder/         → write sequence project.task.type

# Tasks
GET    /api/tasks/?project_id={id}       → search_read project.task
GET    /api/tasks/?project_id={id}&stage_id={id}  → filtered
POST   /api/tasks/                       → create      project.task
GET    /api/tasks/{id}/                  → read        project.task [id]
PATCH  /api/tasks/{id}/                  → write       project.task [id]
DELETE /api/tasks/{id}/                  → write({"active": False})
PATCH  /api/tasks/{id}/move/             → write stage_id (Kanban drag-drop)
GET    /api/tasks/{id}/subtasks/         → search_read project.task parent_id={id}

# Milestones
GET    /api/milestones/?project_id={id}  → search_read project.milestone
POST   /api/milestones/                  → create      project.milestone
PATCH  /api/milestones/{id}/             → write       project.milestone [id]
PATCH  /api/milestones/{id}/reach/       → write is_reached=True

# Timesheets
GET    /api/timesheets/?task_id={id}     → search_read account.analytic.line
POST   /api/timesheets/                  → create      account.analytic.line
PATCH  /api/timesheets/{id}/             → write       account.analytic.line [id]
DELETE /api/timesheets/{id}/             → write({"active": False})

# Project Updates (snapshots)
GET    /api/updates/?project_id={id}     → search_read project.update
POST   /api/updates/                     → create      project.update
GET    /api/updates/{id}/                → read        project.update [id]
```

---

## 6. DRF ViewSet Pattern (all apps follow this)

```python
# apps/tasks/views.py
from rest_framework.viewsets import ViewSet
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework import status
from services.odoo_client import odoo_call
from .serializers import TaskSerializer

TASK_FIELDS = [
    "id", "name", "active", "color", "project_id", "stage_id",
    "user_ids", "priority", "date_deadline", "planned_date_begin",
    "allocated_hours", "effective_hours", "remaining_hours",
    "progress", "description", "tag_ids", "parent_id", "child_ids",
    "depend_on_ids", "milestone_id", "recurring_task", "recurrence_id",
    "sale_line_id", "activity_ids", "rating_last_value",
]

class TaskViewSet(ViewSet):

    def list(self, request):
        project_id = request.query_params.get("project_id")
        domain = [["project_id", "=", int(project_id)]] if project_id else []
        tasks = odoo_call("project.task", "search_read", [domain],
                          {"fields": TASK_FIELDS, "order": "sequence asc"})
        return Response(tasks)

    def retrieve(self, request, pk=None):
        tasks = odoo_call("project.task", "read", [[int(pk)]],
                          {"fields": TASK_FIELDS})
        if not tasks:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(tasks[0])

    def create(self, request):
        serializer = TaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_id = odoo_call("project.task", "create", [serializer.validated_data])
        return Response({"id": new_id}, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        serializer = TaskSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        odoo_call("project.task", "write",
                  [[int(pk)], serializer.validated_data])
        return Response({"id": int(pk)})

    def destroy(self, request, pk=None):
        odoo_call("project.task", "unlink", [[int(pk)]])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"], url_path="move")
    def move(self, request, pk=None):
        """Kanban drag-drop — only updates stage_id."""
        stage_id = request.data.get("stage_id")
        odoo_call("project.task", "write",
                  [[int(pk)], {"stage_id": int(stage_id)}])
        return Response({"id": int(pk), "stage_id": stage_id})
```

---

## 7. React Frontend Structure

```
src/
├── api/
│   ├── client.js             ← Axios instance (baseURL = /api)
│   ├── projects.js           ← getProjects, createProject, updateProject …
│   ├── tasks.js              ← getTasks, createTask, moveTask …
│   ├── stages.js
│   ├── milestones.js
│   ├── timesheets.js
│   └── updates.js
│
├── store/
│   └── projectStore.js       ← Zustand store (projects, tasks, stages)
│
├── pages/
│   ├── ProjectList/          ← /projects  (Kanban of project cards)
│   ├── ProjectDetail/        ← /projects/:id  (top-bar tabs)
│   │   ├── TaskKanban/       ← drag-drop via @hello-pangea/dnd
│   │   ├── TaskList/         ← sortable table view
│   │   ├── TaskGantt/        ← gantt-task-react (dependency arrows)
│   │   ├── TaskCalendar/     ← react-big-calendar
│   │   ├── Timesheets/
│   │   ├── Milestones/
│   │   └── Dashboard/
│   └── MyTasks/              ← /my-tasks  (personal view)
│
├── components/
│   ├── TaskCard/             ← Kanban card (title, assignee, priority, status)
│   ├── TaskForm/             ← Full task modal/drawer
│   ├── StageColumn/          ← Kanban column with header + add-task
│   ├── TimerWidget/          ← start/stop timer, keyboard shortcut
│   ├── ActivityList/         ← schedule call / meeting / to-do
│   ├── RichTextEditor/       ← TipTap (description + checklist)
│   ├── MilestoneBar/         ← progress + reached toggle
│   └── ProjectUpdateCard/    ← snapshot with status color
│
└── utils/
    ├── odooStatus.js         ← map rating_last_value → Approved/Changes Requested
    └── ganttHelpers.js       ← depend_on_ids → arrow data for Gantt
```

### Key React Libraries

| Purpose | Library |
|---|---|
| Kanban drag-drop | `@hello-pangea/dnd` |
| Gantt chart | `gantt-task-react` |
| Calendar | `react-big-calendar` |
| Rich text / checklist | `tiptap` |
| State management | `zustand` |
| Data fetching + cache | `@tanstack/react-query` |
| HTTP client | `axios` |
| UI components | `shadcn/ui` + `tailwindcss` |

---

## 8. Kanban Drag-Drop Flow (end-to-end)

```
User drags TaskCard from Stage A → Stage B
         │
         ▼
onDragEnd() in TaskKanban.jsx
  → optimistic UI update (move card in local state instantly)
  → PATCH /api/tasks/{id}/move/  { stage_id: B.id }
         │
         ▼
Django TaskViewSet.move()
  → odoo_call("project.task", "write", [[id], { "stage_id": B.id }])
         │
         ▼
Odoo updates project.task.stage_id
  → returns True
         │
         ▼
React Query invalidates tasks list
  → confirms card is in Stage B (or rolls back on error)
```

---

## 9. Authentication Strategy

Authentication Strategy

Antigravity uses Odoo credentials for authentication (V1 strategy).

Flow:
Browser → Django (JWT) → Odoo (authentication + data)

- User logs in using Odoo credentials (email + API key/password)
- Django authenticates via Odoo XML-RPC
- Django generates JWT token
- All further requests use JWT
- Odoo API key remains server-side only

NOTE:
- No local Django user database is used in V1
- In future (V2), Django-based user system may be introduced

for its own users. The Odoo API key is **server-side only** — never exposed to the React client.

```
Browser  ──[JWT token (Authorization: Bearer)]──▶  Django  ──[API key]──▶  Odoo
```

```python
# config/settings.py
ODOO_URL     = env("ODOO_URL", default="https://edu-primesoft.odoo.com")
ODOO_DB      = env("ODOO_DB", default="edu-primesoft")
ODOO_API_KEY = env("ODOO_API_KEY")   # loaded from .env — never hard-coded in prod
```

---

## 10. Environment Files

```bash
# .env  (never commit this)
ODOO_URL=https://edu-primesoft.odoo.com
ODOO_DB=edu-primesoft
ODOO_API_KEY=004f6869068950f9bde6cb60a2e32a325850ed91
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

```bash
# .env.example  (commit this)
ODOO_URL=
ODOO_DB=
ODOO_API_KEY=
SECRET_KEY=
DEBUG=
ALLOWED_HOSTS=
```

---

## 11. What Gets Built Next (in order)

| Step | File | Depends on |
|---|---|---|
| 1 | `architecture.md` | ✅ **This file** |
| 2 | `docs/database.md` | This file (field lists above) |
| 3 | `skills/project.md` | CSV field map |
| 4 | `skills/task.md` | CSV field map |
| 5 | `skills/milestone.md` | CSV field map |
| 6 | `skills/timesheet.md` | CSV field map |
| 7 | `skills/activity.md` | CSV field map |
| 8 | `skills/reporting.md` | CSV field map |
| 9 | `docs/features.md` | Transcript + skills |
| 10 | `docs/flows.md` | features.md |
