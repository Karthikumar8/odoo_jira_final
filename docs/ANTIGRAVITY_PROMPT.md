# Antigravity — Master Build Prompt

> **How to use this file**:  
> Copy everything from the line `---` below and paste it as your first message
> whenever you start a new session with any AI (Gemini Pro, Claude, GPT-4).  
> Then at the very end, replace `[YOUR TASK HERE]` with what you want built.

---

You are building **Antigravity** — a full replica of the Odoo Project module.

---

## SECTION 1 — TECH STACK

| Layer | Technology |
|---|---|
| Backend | Django 5 + Django REST Framework (DRF) |
| Frontend | React 18 + Tailwind CSS + shadcn/ui |
| Data source | Odoo cloud via XML-RPC external API — **no local database for Odoo data** |
| State management | Zustand + TanStack Query |
| Drag and drop | @hello-pangea/dnd |
| Gantt | gantt-task-react |
| Calendar | react-big-calendar |
| Rich text | TipTap |

**Odoo connection details**

```
Host     : https://edu-primesoft.odoo.com
Database : edu-primesoft
API key  : 004f6869068950f9bde6cb60a2e32a325850ed91
```

The API key is **server-side only**. Never send it to the React frontend. Never hard-code it in committed files — load it from `.env`.

---

## SECTION 2 — FOLDER STRUCTURE & WHAT EACH FILE IS FOR

Read the files in the order listed. Each file has a specific job — do not skip any.

```
antigravity/
│
├── docs/                        ← READ THESE FIRST before writing any code
│   ├── architecture.md          ← System design: how Django, React, and Odoo XML-RPC
│   │                               connect. Has the OdooClient singleton pattern,
│   │                               DRF ViewSet pattern, and Kanban drag-drop flow.
│   │
│   ├── database.md              ← Every Odoo model used in Antigravity.
│   │                               Has exact field names, types, relations, serializers,
│   │                               and domain filters. PRIMARY reference for field names.
│   │                               If this file has the answer, use it — do not guess.
│   │
│   ├── features.md              ← All 19 features extracted from 18 official Odoo v18
│   │                               tutorial videos. Tells you exactly what each feature
│   │                               does and which Odoo fields it touches.
│   │
│   └── flows.md                 ← 17 end-to-end user flows. Each flow has 4 parts:
│                                   what the user does in React → what Django calls →
│                                   what Odoo does → what React re-renders.
│                                   Use this when building any feature end-to-end.
│
├── skills/                      ← READ THE RELEVANT SKILL before building that feature
│   ├── project.md               ← project.project: all fields, ViewSet, React hooks,
│   │                               domain filters, gotchas. Use when building anything
│   │                               related to the project list, project settings,
│   │                               project Kanban, or project status dot.
│   │
│   ├── task.md                  ← project.task: all fields, ViewSet, React hooks.
│   │                               ⚠ FIXED 2026-03-30: state is WRITABLE (readonly=False),
│   │                               name is STORED (store=True), display_in_project is
│   │                               STORED and WRITABLE. Use when building Kanban cards,
│   │                               task forms, drag-drop, status dot, timer, subtasks.
│   │
│   ├── stage.md                 ← Covers TWO models — read carefully:
│   │                               project.task.type = Kanban columns inside a project
│   │                               project.project.stage = global project pipeline
│   │                               Use when building the Kanban board columns,
│   │                               stage reordering, fold/unfold, email-on-move.
│   │
│   ├── milestone.md             ← project.milestone: fields, ViewSet, reach logic,
│   │                               invoicing by milestone. Use when building the
│   │                               milestone panel in the project dashboard.
│   │
│   ├── timesheet.md             ← account.analytic.line: fields, timer API, validation,
│   │                               leaderboard queries. Use when building the timesheet
│   │                               tab, timer widget, weekly grid, and leaderboard.
│   │                               ⚠ ALWAYS filter by project_id or task_id — never
│   │                               query this model unfiltered.
│   │
│   ├── activity.md              ← mail.activity + mail.activity.type: fields, CRUD,
│   │                               activity icons on Kanban cards. Use when building
│   │                               the schedule activity modal and activity timeline.
│   │
│   └── reporting.md             ← Three reporting surfaces:
│                                   1. Task analysis (project.task read_group)
│                                   2. Timesheet reporting (account.analytic.line read_group)
│                                   3. Customer ratings (rating.rating)
│                                   Has all read_group call signatures and DRF endpoints.
│
└── ui/                          ← VISUAL REFERENCE — check these when building any UI
    ├── 01_project_kanban.png    ← Global project Kanban grid
    ├── 02_project_card.png      ← Single project card with all badges
    ├── 03_project_list.png      ← Project list view
    ├── 04_new_project_modal.png ← Project creation form
    ├── 05_project_settings.png  ← Project settings drawer (full)
    ├── 06_task_kanban.png       ← Task Kanban board with columns
    ├── 07_task_card.png         ← Single task card zoomed in
    ├── 08_status_dot_open.png   ← Status dot dropdown with all 6 states
    ├── 09_column_header.png     ← Stage column header with fold + add buttons
    ├── 10_task_form_top.png     ← Task form top half (title, assignees, fields)
    ├── 11_task_form_desc.png    ← Task form description + checklist
    ├── 12_task_subtasks_tab.png ← Subtasks tab
    ├── 13_task_blockedby_tab.png← Blocked By tab with dependency arrows
    ├── 14_gantt_view.png        ← Gantt view with bars and arrows
    ├── 15_calendar_view.png     ← Calendar monthly view
    ├── 16_list_view.png         ← Task list view (sortable table)
    ├── 17_topbar_tabs.png       ← Top bar with all tabs visible
    ├── 18_topbar_add.png        ← Add tabs panel open
    ├── 19_dashboard.png         ← Project dashboard full page
    ├── 20_project_update.png    ← Project update / monthly snapshot form
    ├── 21_timesheet_grid.png    ← Weekly timesheet grid with green/red totals
    ├── 22_timer_widget.png      ← Timer running with project + task selected
    ├── 23_leaderboard.png       ← Timesheet leaderboard
    ├── 24_rating_email.png      ← Customer rating email (3 smileys)
    └── 25_ratings_report.png    ← Customer ratings report table
```

**If a ui/ screenshot exists for what you are building — match it exactly.**  
If no screenshot exists, replicate the behaviour at `https://demo2.odoo.com/odoo/project`.

---

## SECTION 3 — ODOO XML-RPC RULES

### 3.1 The OdooClient (use this pattern everywhere)

```python
# services/odoo_client.py
import xmlrpc.client
from django.conf import settings

_uid = None
_models = None

def _get_connection():
    global _uid, _models
    if _uid is None:
        common = xmlrpc.client.ServerProxy(f"{settings.ODOO_URL}/xmlrpc/2/common")
        _uid = common.authenticate(
            settings.ODOO_DB, settings.ODOO_USER, settings.ODOO_API_KEY, {}
        )
        _models = xmlrpc.client.ServerProxy(f"{settings.ODOO_URL}/xmlrpc/2/object")
    return _uid, _models

def odoo_call(model, method, args, kwargs=None):
    uid, models = _get_connection()
    try:
        return models.execute_kw(
            settings.ODOO_DB, uid, settings.ODOO_API_KEY,
            model, method, args, kwargs or {}
        )
    except xmlrpc.client.Fault as e:
        raise OdooBusinessError(e.faultString) from e
    except Exception as e:
        raise OdooConnectionError(str(e)) from e
```

### 3.2 Many2many Write Commands (mandatory — wrong format = silent failure)

| Command | Tuple | When to use |
|---|---|---|
| Replace all | `(6, 0, [1, 2, 3])` | Setting assignees, tags, dependencies from scratch |
| Add one | `(4, id, 0)` | Adding one tag/assignee without removing others |
| Remove one | `(3, id, 0)` | Removing one without touching others |
| Clear all | `(5, 0, 0)` | Remove all linked records |

### 3.3 Fields You Must NEVER Write

These are computed by Odoo. Sending them in `create` or `write` will throw an error or be silently ignored:

```
project.task:    effective_hours, remaining_hours, overtime, progress,
                 date_assign, date_last_stage_update, dependent_ids,
                 subtask_effective_hours, total_hours_spent
project.milestone: reached_date, task_ids (inverse — link via task.milestone_id)
account.analytic.line: amount, timesheet_invoice_type, validated
project.update:  task_count, closed_task_count, allocated_time, timesheet_time
```

### 3.4 Critical Field Name Rules

- `project.task` deadline field → `date_deadline` (NOT "deadline")
- `project.project` deadline field → `date` (NOT "deadline" and NOT "date_deadline")
- `project.task` status dot → `state` (NOT "status" — and it IS writable, readonly=False)
- `project.task` Kanban column → `stage_id` → `project.task.type` (NOT `project.project.stage`)
- `project.project` global pipeline → `stage_id` → `project.project.stage` (different model)
- Timesheet hours field → `unit_amount` (NOT "hours" or "duration")
- Timesheet model → `account.analytic.line` (NOT "project.timesheet" — that model does not exist)

---

## SECTION 4 — AUTHENTICATION & ROLE-BASED PERMISSIONS

Antigravity has its own login system. Users authenticate against Django — not Odoo portal.  
The Odoo API key is shared (server-side only). Antigravity controls what each user can do.

### 4.1 User Model

```python
# apps/accounts/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models

class AntигravityUser(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("tl", "Team Lead"),
        ("employee", "Employee"),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="employee")
    odoo_partner_id = models.IntegerField(null=True, blank=True)
    odoo_employee_id = models.IntegerField(null=True, blank=True)
    odoo_user_id = models.IntegerField(null=True, blank=True)
```

### 4.2 Permission Matrix

| Action | Admin | Team Lead | Employee |
|---|---|---|---|
| View all projects | ✅ | ✅ (assigned only) | ✅ (assigned only) |
| Create project | ✅ | ❌ | ❌ |
| Edit project settings | ✅ | ❌ | ❌ |
| Delete / archive project | ✅ | ❌ | ❌ |
| Create / edit stages | ✅ | ❌ | ❌ |
| View all tasks | ✅ | ✅ (own projects) | ✅ (assigned to them) |
| Create task | ✅ | ✅ | ❌ |
| Edit any task | ✅ | ✅ (own projects) | ✅ (own tasks only) |
| Update task state (status dot) | ✅ | ✅ | ✅ (own tasks) |
| Delete / archive task | ✅ | ✅ (own projects) | ❌ |
| Log timesheet | ✅ | ✅ (own entries) | ✅ (own entries) |
| Edit others' timesheets | ✅ | ❌ | ❌ |
| Validate timesheets | ✅ | ✅ (own team) | ❌ |
| View dashboard | ✅ | ✅ | ❌ |
| View profitability | ✅ | ❌ | ❌ |
| Create milestones | ✅ | ✅ (own projects) | ❌ |
| View audit log | ✅ | ✅ (own projects) | ❌ |
| Manage users | ✅ | ❌ | ❌ |

### 4.3 DRF Permission Class Pattern

```python
# apps/accounts/permissions.py
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == "admin"

class IsAdminOrTL(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("admin", "tl")

class IsAuthenticated(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated
```

Apply on each ViewSet:

```python
class ProjectViewSet(ViewSet):
    def get_permissions(self):
        if self.action in ("create", "destroy"):
            return [IsAdmin()]
        if self.action in ("partial_update",):
            return [IsAdminOrTL()]
        return [IsAuthenticated()]
```

### 4.4 Login Flow

```
POST /api/auth/login/   { "username": "...", "password": "..." }
→ Django authenticates against its own user table
→ Returns JWT token (use djangorestframework-simplejwt)
→ Token stored in React (httpOnly cookie recommended)
→ All subsequent API calls include: Authorization: Bearer <token>
→ Django uses the master Odoo API key for all Odoo calls (user never sees it)
```

---

## SECTION 5 — AUDIT LOG (Odoo Chatter — Read Only)

Antigravity reads the Odoo chatter (`mail.message`) to display a change history timeline.  
No local audit table is needed — Odoo logs every field change server-side.

### 5.1 How Odoo Logs Changes

When any field on `project.task` or `project.project` changes, Odoo creates:
- One `mail.message` record with `message_type = "notification"` or `"comment"`
- One or more `mail.tracking.value` records (linked via `tracking_value_ids`) containing the before and after values

### 5.2 Odoo Models Used

**`mail.message`** — the chatter entry itself

| Field | Type | What it contains |
|---|---|---|
| `id` | integer | Message ID |
| `model` | char | `"project.task"` or `"project.project"` |
| `res_id` | many2one_reference | The task or project ID |
| `author_id` | many2one → `res.partner` | Who made the change |
| `date` | datetime | When the change happened |
| `body` | html | Human-readable description of change |
| `message_type` | selection | `notification` = field change, `comment` = user note, `email` = email received |
| `subtype_id` | many2one → `mail.message.subtype` | Category of message |
| `tracking_value_ids` | one2many → `mail.tracking.value` | Field-level diff records |

**`mail.tracking.value`** — the field-level before/after diff

| Field | Type | What it contains |
|---|---|---|
| `id` | integer | Tracking record ID |
| `mail_message_id` | many2one → `mail.message` | Parent message |
| `field_id` | many2one → `ir.model.fields` | Which field changed |
| `field_info` | json | `{ "string": "Stage", "type": "many2one" }` |
| `old_value_char` | char | Previous value (text representation) |
| `new_value_char` | char | New value (text representation) |
| `old_value_integer` | integer | Previous value (integer fields) |
| `new_value_integer` | integer | New value (integer fields) |
| `old_value_float` | float | Previous value (float fields) |
| `new_value_float` | float | New value (float fields) |
| `old_value_datetime` | datetime | Previous value (date fields) |
| `new_value_datetime` | datetime | New value (date fields) |

### 5.3 API Calls

```python
# GET /api/audit-log/?model=project.task&record_id=201
# Fetch chatter messages for a specific task

CHATTER_FIELDS = [
    "id", "model", "res_id", "author_id", "date",
    "body", "message_type", "subtype_id", "tracking_value_ids",
]

def get_chatter(model_name, record_id, limit=50):
    messages = odoo_call("mail.message", "search_read",
        [[
            ["model", "=", model_name],
            ["res_id", "=", record_id],
            ["message_type", "in", ["notification", "comment", "email"]],
        ]],
        {
            "fields": CHATTER_FIELDS,
            "order": "date desc",
            "limit": limit,
        }
    )
    # For each message, fetch its tracking values
    for msg in messages:
        if msg["tracking_value_ids"]:
            msg["tracking_values"] = odoo_call(
                "mail.tracking.value", "read",
                [msg["tracking_value_ids"]],
                {"fields": [
                    "field_info", "old_value_char", "new_value_char",
                    "old_value_integer", "new_value_integer",
                    "old_value_float", "new_value_float",
                    "old_value_datetime", "new_value_datetime",
                ]}
            )
        else:
            msg["tracking_values"] = []
    return messages
```

### 5.4 DRF Endpoint

```python
# GET /api/audit-log/?model=project.task&record_id=201&limit=50
# GET /api/audit-log/?model=project.project&record_id=42

# Access: Admin sees all. TL sees own projects. Employee: no access.
```

### 5.5 React Audit Timeline Component

The timeline appears as a panel on the right side of the task form and project settings page.

```
Each entry renders as:
┌─────────────────────────────────────────────┐
│ 👤 Dina Ahmed          2 hours ago          │
│ moved task to "Review" stage                │
│ ▼ [expand to see field diff]                │
│   Stage:  Ongoing → Review                  │
│   Status: In Progress → Approved            │
└─────────────────────────────────────────────┘
```

Logic for the entry label:
- `message_type = "comment"` → show the `body` as a user note
- `message_type = "notification"` + `tracking_value_ids` → show field diffs
- `message_type = "email"` → show "Email received from [author]"

---

## SECTION 6 — LOGIN PAGE

The login page is the first page a user sees. It is Antigravity's own login — not Odoo's.

**Design**: Match the clean, minimal Odoo login style (white card, centered, logo at top).  
**Reference**: `ui/` folder does not have a login screenshot — use the Odoo login at  
`https://demo2.odoo.com/web/login` as the visual reference.

**Fields**: Username (or email), Password, Login button, "Forgot password?" link.

**After login**:
- Admin → redirect to `/projects` (full project Kanban, all projects visible)
- Team Lead → redirect to `/projects` (only their assigned projects visible)
- Employee → redirect to `/my-tasks` (personal task list, no project Kanban)

**Failed login**: Show inline error — "Invalid username or password."  
**Token expiry**: Redirect to `/login` with message "Your session has expired."

---

## SECTION 7 — CRITICAL RULES (read before writing any code)

1. **No local DB for Odoo data** — Django never stores projects, tasks, stages, timesheets, milestones, or activities in SQLite/PostgreSQL. The only Django models are `AntигravityUser` (auth) and any session/config data.

2. **API key never leaves the server** — never pass `ODOO_API_KEY` to a React component, never log it, never include it in a response.

3. **Always use exact Odoo field names** — every field name in every `odoo_call()` must exactly match the `field_name` column in the `edu-primesoft` CSV (24,749 rows, extracted 2026-03-26). Check `docs/database.md` first. If it is not in `database.md`, look at the relevant `skills/*.md` file. If still not found, say so — do not invent a field name.

4. **`state` on `project.task` is writable** — `readonly=False` confirmed in CSV. Always write it directly for status dot changes. Never treat it as read-only.

5. **Archive, never delete** — use `write({"active": False})` for tasks and projects. Never call `unlink` on records that have timesheets — it will fail or leave orphan analytic lines.

6. **Filter timesheets** — always include `["project_id", "!=", False]` or `["task_id", "=", task_id]` in every `account.analytic.line` query. Unfiltered queries return all accounting lines in the entire Odoo instance.

7. **Many2many commands are mandatory** — a plain Python list `[1, 2, 3]` sent to a many2many field will raise a `ValueError`. Always use `(6, 0, [ids])` for replace-all, `(4, id, 0)` for add-one.

8. **`read_group` for aggregated data** — never fetch 500 records and sum in Python. Use `odoo_call(model, "read_group", ...)` for all counts, sums, and averages.

9. **Permissions are enforced in Django** — the Odoo API key has full access to everything. Django permission classes are the only access control. Never skip them.

10. **Match the screenshots** — if a `ui/*.png` file exists for the component you are building, open it and match the layout exactly before writing JSX.

---

## SECTION 8 — WHAT TO BUILD NOW

[YOUR TASK HERE — replace this line with what you want the AI to build next]

Examples:
- "Build the Django project structure, settings.py, OdooClient service, and base URL config"
- "Build the login page React component and the Django auth endpoints (POST /api/auth/login/ and POST /api/auth/logout/)"
- "Build the Task Kanban view React component using the layout in ui/06_task_kanban.png and ui/07_task_card.png"
- "Build the Audit Log timeline component for the task form right panel"
- "Build the full TaskViewSet in Django with all custom actions (move, state, timer, subtasks, duplicate)"
