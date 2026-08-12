# School Management System TODO

- [x] Database schema & Drizzle migrations for students, staff, classes, subjects, timetables, attendance, results, result edit requests, promotion records, and audit logs
- [x] Backend tRPC procedures for full CRUD, search, pagination, CSV bulk student import with per-row validation, and audit log aggregation
- [x] Automatic email/SMS credential dispatch service upon student or staff account creation
- [x] Role-based dashboard layouts & RBAC for Admin, Teacher, and Student roles
- [x] Student & staff management pages with search/filter boxes by name, reg no, email, and role
- [x] Class & subject management with teacher assignment and timetable linking
- [x] Weekly timetable view rendered as an actual 7-column (Mon-Sun) x time-slot grid
- [x] Results & grade management with teacher entry and admin approval workflow
- [x] Attendance tracking marking and daily viewing per class
- [x] Student promotion and graduation workflow with recorded history
- [x] Unified audit log page aggregating PromotionRecord, ResultEditRequest, and activity trails
- [x] Comprehensive unit tests (Vitest) for backend procedures and CSV validation
