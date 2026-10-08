"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { LoadingAnimation } from "@/components/ui/LoadingAnimation";
import { DataErrorState } from "@/components/ui/DataErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { Shield, Sliders, History, Layers, Check, X, Plus, Trash2 } from "lucide-react";

type HierarchyItem = {
  collegeId: number;
  collegeName: string;
  courseId: number;
  courseName: string;
  branchId: number;
  branchName: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  subjectType: string;
  credits: number;
  semester: number | null;
  year: number | null;
  assignedFaculty: Array<{
    staffLinkId: number;
    displayName: string;
    employeeCode: string | null;
    departmentName: string | null;
    hrmsEmployeeId: string | null;
    accessStatus: "enabled" | "disabled";
    accessLevel: "college" | "course" | "branch" | "individual" | "none";
    ruleId: number | null;
  }>;
  groupAccessStatus: "enabled" | "disabled" | "mixed";
  groupAccessLevel: "college" | "course" | "branch" | "individual" | "none";
};

type AccessRule = {
  id: number;
  accessLevel: "college" | "course" | "branch" | "individual";
  collegeId: number | null;
  courseId: number | null;
  branchId: number | null;
  subjectId: number | null;
  facultyStaffLinkId: number | null;
  facultyName?: string;
  collegeName?: string;
  courseName?: string;
  branchName?: string;
  subjectName?: string;
  subjectCode?: string;
  academicYearLabel?: string;
  isEnabled: boolean;
  createdAt: string;
};

type ApprovalLevel = {
  levelNumber: number;
  approverRoleKey: string;
  levelLabel: string;
  isActive: boolean;
};

type AuditLog = {
  id: number;
  actorName: string;
  action: string;
  entityType: string;
  entityId: number | null;
  createdAt: string;
  details: unknown;
};

export function InternalMarksManagementView() {
  const { hasPermission, hasAnyPermission } = useAuth();
  const canEdit = hasAnyPermission("internal_marks_mgmt.edit", "internal_marks_mgmt.view", "examinations.view");

  const [activeTab, setActiveTab] = useState<"hierarchy" | "rules" | "workflows" | "audit">("hierarchy");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Masters & Filters
  const [masters, setMasters] = useState<{
    colleges: Array<{ id: number; name: string }>;
    courses: Array<{ id: number; name: string; collegeId: number }>;
    branches: Array<{ id: number; name: string; courseId: number }>;
  }>({ colleges: [], courses: [], branches: [] });

  const [filterCollegeId, setFilterCollegeId] = useState<string>("all");
  const [filterCourseId, setFilterCourseId] = useState<string>("all");
  const [filterBranchId, setFilterBranchId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Action Level selection for the filter bar
  const [quickLevel, setQuickLevel] = useState<"college" | "course" | "branch">("branch");

  // Data states
  const [hierarchy, setHierarchy] = useState<HierarchyItem[]>([]);
  const [accessRules, setAccessRules] = useState<AccessRule[]>([]);
  const [approvalLevels, setApprovalLevels] = useState<ApprovalLevel[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Configure Access Modal state with dynamic dropdown selections
  const [modalState, setModalState] = useState<{
    open: boolean;
    level: "college" | "course" | "branch" | "individual";
    selectedCollegeId: number | null;
    selectedCourseId: number | null;
    selectedBranchId: number | null;
    selectedSubjectId: number | null;
    selectedFacultyId: number | null;
  }>({
    open: false,
    level: "branch",
    selectedCollegeId: null,
    selectedCourseId: null,
    selectedBranchId: null,
    selectedSubjectId: null,
    selectedFacultyId: null,
  });

  const [savingRule, setSavingRule] = useState(false);

  // Load Academic Masters
  useEffect(() => {
    async function loadMasters() {
      try {
        const res = await apiFetch("/catalog/masters");
        if (res.ok) {
          const body = await res.json();
          setMasters({
            colleges: body.colleges || [],
            courses: body.courses || [],
            branches: body.branches || [],
          });
        }
      } catch (err) {
        console.warn("Failed to load academic masters:", err);
      }
    }
    void loadMasters();
  }, []);

  // Fetch data depending on active tab
  async function fetchData(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);
    try {
      if (activeTab === "hierarchy") {
        const query = new URLSearchParams();
        if (filterCollegeId !== "all") query.set("collegeId", filterCollegeId);
        if (filterCourseId !== "all") query.set("courseId", filterCourseId);
        if (filterBranchId !== "all") query.set("branchId", filterBranchId);

        const res = await apiFetch(`/internal-marks/subjects-hierarchy?${query.toString()}`);
        if (!res.ok) throw new Error("Failed to load subject hierarchy");
        const body = await res.json();
        setHierarchy(body.data || []);
      } else if (activeTab === "rules") {
        const res = await apiFetch("/internal-marks/access-rules");
        if (!res.ok) throw new Error("Failed to load access rules");
        const body = await res.json();
        setAccessRules(body.data || []);
      } else if (activeTab === "workflows") {
        const res = await apiFetch("/internal-marks/approval-configs");
        if (!res.ok) throw new Error("Failed to load approval configurations");
        const body = await res.json();
        setApprovalLevels(body.data || []);
      } else if (activeTab === "audit") {
        const res = await apiFetch("/internal-marks/audit-logs");
        if (!res.ok) throw new Error("Failed to load audit logs");
        const body = await res.json();
        setAuditLogs(body.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void fetchData(true);
  }, [activeTab, filterCollegeId, filterCourseId, filterBranchId]);

  // Direct Quick Save from Selection Bar
  async function handleQuickSaveAccess(isEnabled: boolean) {
    let cId: number | null = filterCollegeId !== "all" ? Number(filterCollegeId) : null;
    if (!cId && masters.colleges.length === 1) {
      cId = masters.colleges[0].id;
    }

    let crId: number | null = filterCourseId !== "all" ? Number(filterCourseId) : null;
    let bId: number | null = filterBranchId !== "all" ? Number(filterBranchId) : null;

    // Fall back to applying access for all currently displayed hierarchy items if specific filter wasn't explicitly selected
    if ((quickLevel === "branch" && !bId) || (quickLevel === "course" && !crId) || (!cId && masters.colleges.length > 1)) {
      if (filteredHierarchy.length > 0) {
        setSavingRule(true);
        try {
          for (const item of filteredHierarchy) {
            if (item.assignedFaculty.length > 0) {
              for (const f of item.assignedFaculty) {
                const payload = {
                  accessLevel: "individual",
                  collegeId: item.collegeId,
                  courseId: item.courseId,
                  branchId: item.branchId,
                  subjectId: item.subjectId,
                  facultyStaffLinkId: f.staffLinkId,
                  isEnabled,
                };
                await apiFetch("/internal-marks/access-rules", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
              }
            } else {
              const payload = {
                accessLevel: "branch",
                collegeId: item.collegeId,
                courseId: item.courseId,
                branchId: item.branchId,
                subjectId: item.subjectId,
                isEnabled,
              };
              await apiFetch("/internal-marks/access-rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            }
          }
          await fetchData(false);
        } catch (err) {
          alert(err instanceof Error ? err.message : "Failed to update access rules");
        } finally {
          setSavingRule(false);
        }
        return;
      } else {
        alert("Please select College, Course, or Branch filter to set access rule.");
        return;
      }
    }

    setSavingRule(true);
    try {
      const payload = {
        accessLevel: quickLevel,
        collegeId: cId,
        courseId: crId,
        branchId: bId,
        isEnabled,
      };

      const res = await apiFetch("/internal-marks/access-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to update access rule");
      }

      await fetchData(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSavingRule(false);
    }
  }

  // Selected rows for bulk access configuration
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  function getItemKey(item: HierarchyItem) {
    return `${item.collegeId}-${item.courseId}-${item.branchId}-${item.subjectId}`;
  }

  function toggleSelectAll() {
    if (selectedRowIds.size === filteredHierarchy.length && filteredHierarchy.length > 0) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(filteredHierarchy.map(getItemKey)));
    }
  }

  function toggleSelectRow(key: string) {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleBulkAccess(isEnabled: boolean) {
    if (selectedRowIds.size === 0) return;
    const selectedItems = filteredHierarchy.filter((item) =>
      selectedRowIds.has(getItemKey(item))
    );

    // Optimistic update
    setHierarchy((prev) =>
      prev.map((h) => {
        if (selectedRowIds.has(getItemKey(h))) {
          const updatedFaculty = h.assignedFaculty.map((f) => ({
            ...f,
            accessStatus: isEnabled ? ("enabled" as const) : ("disabled" as const),
            accessLevel: "individual" as const,
          }));
          return {
            ...h,
            assignedFaculty: updatedFaculty,
            groupAccessStatus: isEnabled ? "enabled" : "disabled",
          };
        }
        return h;
      })
    );

    setSavingRule(true);
    try {
      for (const item of selectedItems) {
        if (item.assignedFaculty.length > 0) {
          for (const f of item.assignedFaculty) {
            const payload = {
              accessLevel: "individual",
              collegeId: item.collegeId,
              courseId: item.courseId,
              branchId: item.branchId,
              subjectId: item.subjectId,
              facultyStaffLinkId: f.staffLinkId,
              isEnabled,
            };
            await apiFetch("/internal-marks/access-rules", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }
        } else {
          const payload = {
            accessLevel: "branch",
            collegeId: item.collegeId,
            courseId: item.courseId,
            branchId: item.branchId,
            isEnabled,
          };
          await apiFetch("/internal-marks/access-rules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }
      }
      setSelectedRowIds(new Set());
      await fetchData(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update selected access rules");
      await fetchData(false);
    } finally {
      setSavingRule(false);
    }
  }

  // Direct Toggle Access for a single faculty member
  async function handleToggleIndividualFacultyAccess(
    item: HierarchyItem,
    staffLinkId: number,
    isEnabled: boolean
  ) {
    // Optimistic UI update
    setHierarchy((prev) =>
      prev.map((h) => {
        if (
          h.collegeId === item.collegeId &&
          h.courseId === item.courseId &&
          h.branchId === item.branchId &&
          h.subjectId === item.subjectId
        ) {
          const updatedFaculty = h.assignedFaculty.map((f) =>
            f.staffLinkId === staffLinkId
              ? {
                  ...f,
                  accessStatus: isEnabled ? ("enabled" as const) : ("disabled" as const),
                  accessLevel: "individual" as const,
                }
              : f
          );
          const allEnabled = updatedFaculty.every((f) => f.accessStatus === "enabled");
          const anyEnabled = updatedFaculty.some((f) => f.accessStatus === "enabled");
          return {
            ...h,
            assignedFaculty: updatedFaculty,
            groupAccessStatus: allEnabled ? "enabled" : anyEnabled ? "mixed" : "disabled",
          };
        }
        return h;
      })
    );

    setSavingRule(true);
    try {
      const payload = {
        accessLevel: "individual",
        collegeId: item.collegeId,
        courseId: item.courseId,
        branchId: item.branchId,
        subjectId: item.subjectId,
        facultyStaffLinkId: staffLinkId,
        isEnabled,
      };

      const res = await apiFetch("/internal-marks/access-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to update individual access rule");
      }

      await fetchData(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save rule");
      await fetchData(false);
    } finally {
      setSavingRule(false);
    }
  }

  // Direct Toggle Access for all faculty in a subject row
  async function handleToggleSubjectRowAccess(
    item: HierarchyItem,
    isEnabled: boolean
  ) {
    if (item.assignedFaculty.length === 0) {
      alert("No faculty assigned to this subject.");
      return;
    }

    // Optimistic UI update for row
    setHierarchy((prev) =>
      prev.map((h) => {
        if (
          h.collegeId === item.collegeId &&
          h.courseId === item.courseId &&
          h.branchId === item.branchId &&
          h.subjectId === item.subjectId
        ) {
          const updatedFaculty = h.assignedFaculty.map((f) => ({
            ...f,
            accessStatus: isEnabled ? ("enabled" as const) : ("disabled" as const),
            accessLevel: "individual" as const,
          }));
          return {
            ...h,
            assignedFaculty: updatedFaculty,
            groupAccessStatus: isEnabled ? "enabled" : "disabled",
          };
        }
        return h;
      })
    );

    setSavingRule(true);
    try {
      for (const f of item.assignedFaculty) {
        const payload = {
          accessLevel: "individual",
          collegeId: item.collegeId,
          courseId: item.courseId,
          branchId: item.branchId,
          subjectId: item.subjectId,
          facultyStaffLinkId: f.staffLinkId,
          isEnabled,
        };

        await apiFetch("/internal-marks/access-rules", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      await fetchData(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save rule");
      await fetchData(false);
    } finally {
      setSavingRule(false);
    }
  }

  // Workflow editing handlers
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  async function handleSaveWorkflowConfigs() {
    setSavingWorkflow(true);
    try {
      const res = await apiFetch("/internal-marks/approval-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId: null,
          levels: approvalLevels,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to save workflow levels");
      }

      alert("Approval workflow configuration saved successfully!");
      await fetchData(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save workflow");
    } finally {
      setSavingWorkflow(false);
    }
  }

  function handleAddWorkflowLevel() {
    setApprovalLevels((prev) => [
      ...prev,
      {
        levelNumber: prev.length + 1,
        approverRoleKey: "superadmin",
        levelLabel: `Level ${prev.length + 1} Approval`,
        isActive: true,
      },
    ]);
  }

  function handleRemoveWorkflowLevel(index: number) {
    setApprovalLevels((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((lvl, i) => ({ ...lvl, levelNumber: i + 1 }))
    );
  }

  function handleUpdateWorkflowLevel(
    index: number,
    field: keyof ApprovalLevel,
    value: unknown
  ) {
    setApprovalLevels((prev) =>
      prev.map((lvl, i) => (i === index ? { ...lvl, [field]: value } : lvl))
    );
  }

  const activeRulesList = accessRules.filter((r) => r.isEnabled);

  // Save Access Rule from Modal
  async function handleSaveAccessRule(isEnabled: boolean) {
    const level = modalState.level;
    const cId = modalState.selectedCollegeId ? Number(modalState.selectedCollegeId) : null;
    const crId = modalState.selectedCourseId ? Number(modalState.selectedCourseId) : null;
    const bId = modalState.selectedBranchId ? Number(modalState.selectedBranchId) : null;
    const sId = modalState.selectedSubjectId ? Number(modalState.selectedSubjectId) : null;
    const fId = modalState.selectedFacultyId ? Number(modalState.selectedFacultyId) : null;

    if (level !== "individual" && !cId) {
      alert("Please select a College.");
      return;
    }
    if ((level === "course" || level === "branch" || level === "individual") && !crId) {
      alert("Please select a Course.");
      return;
    }
    if ((level === "branch" || level === "individual") && !bId) {
      alert("Please select a Branch.");
      return;
    }
    if (level === "individual" && (!sId || !fId)) {
      alert("Please select both a Subject and a Faculty member for Individual Access.");
      return;
    }

    setSavingRule(true);
    try {
      const payload = {
        accessLevel: level,
        collegeId: cId,
        courseId: crId,
        branchId: bId,
        subjectId: level === "individual" ? sId : null,
        facultyStaffLinkId: level === "individual" ? fId : null,
        isEnabled,
      };

      const res = await apiFetch("/internal-marks/access-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to save access rule");
      }

      setModalState((prev) => ({ ...prev, open: false }));
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSavingRule(false);
    }
  }

  // Delete Access Rule
  async function handleDeleteRule(ruleId: number) {
    if (!confirm("Are you sure you want to remove this access rule?")) return;
    try {
      const res = await apiFetch(`/internal-marks/access-rules/${ruleId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete rule");
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete rule");
    }
  }

  // Filter hierarchy in memory by search query
  const filteredHierarchy = hierarchy.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.subjectName.toLowerCase().includes(q) ||
      item.subjectCode.toLowerCase().includes(q) ||
      item.branchName.toLowerCase().includes(q) ||
      item.courseName.toLowerCase().includes(q) ||
      item.assignedFaculty.some((f) => f.displayName.toLowerCase().includes(q))
    );
  });

  const availableCourses = masters.courses.filter(
    (c) => filterCollegeId === "all" || Number(c.collegeId) === Number(filterCollegeId)
  );

  const availableBranches = masters.branches.filter(
    (b) => filterCourseId === "all" || Number(b.courseId) === Number(filterCourseId)
  );

  // Modal specific options with robust numeric comparison
  const modalCourses = masters.courses.filter(
    (c) => modalState.selectedCollegeId == null || Number(c.collegeId) === Number(modalState.selectedCollegeId)
  );

  const modalBranches = masters.branches.filter(
    (b) => modalState.selectedCourseId == null || Number(b.courseId) === Number(modalState.selectedCourseId)
  );

  const modalSubjects = hierarchy
    .filter(
      (h) =>
        (modalState.selectedCollegeId == null || Number(h.collegeId) === Number(modalState.selectedCollegeId)) &&
        (modalState.selectedCourseId == null || Number(h.courseId) === Number(modalState.selectedCourseId)) &&
        (modalState.selectedBranchId == null || Number(h.branchId) === Number(modalState.selectedBranchId))
    )
    .map((h) => ({ id: h.subjectId, code: h.subjectCode, name: h.subjectName }));

  const uniqueModalSubjects = Array.from(
    new Map(modalSubjects.map((s) => [s.id, s])).values()
  );

  const modalFacultyOptions = hierarchy
    .filter((h) => modalState.selectedSubjectId == null || Number(h.subjectId) === Number(modalState.selectedSubjectId))
    .flatMap((h) => h.assignedFaculty);

  const uniqueModalFaculty = Array.from(
    new Map(modalFacultyOptions.map((f) => [f.staffLinkId, f])).values()
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Internal Marks Management"
        description="Superadmin side control panel to select Colleges, Courses, Branches, Subjects, and Faculty to enable/disable internal marks upload access with clear precedence hierarchy."
      />

      {/* Tabs Bar */}
      <div className="flex border-b border-border">
        <button
          type="button"
          onClick={() => setActiveTab("hierarchy")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "hierarchy"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Layers className="h-4 w-4" />
          Subject & Faculty Hierarchy
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "rules"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Shield className="h-4 w-4" />
          Access Rules List ({accessRules.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("workflows")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "workflows"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Approval Workflows
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
            activeTab === "audit"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <History className="h-4 w-4" />
          Audit Logs
        </button>
      </div>

      {/* Tab Content 1: Hierarchy View */}
      {activeTab === "hierarchy" && (
        <div className="space-y-4">
          {/* SINGLE UNIFIED FILTER & SELECTION BAR */}
          <Card className="p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Dropdown Filters & Search */}
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-44 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                    College
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white h-8 px-2 text-xs outline-none focus:border-brand-600"
                    value={filterCollegeId}
                    onChange={(e) => {
                      setFilterCollegeId(e.target.value);
                      setFilterCourseId("all");
                      setFilterBranchId("all");
                    }}
                  >
                    <option value="all">All Colleges</option>
                    {masters.colleges.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                    Course
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white h-8 px-2 text-xs outline-none focus:border-brand-600"
                    value={filterCourseId}
                    onChange={(e) => {
                      setFilterCourseId(e.target.value);
                      setFilterBranchId("all");
                    }}
                  >
                    <option value="all">All Courses</option>
                    {availableCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:w-36 shrink-0">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                    Branch
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white h-8 px-2 text-xs outline-none focus:border-brand-600"
                    value={filterBranchId}
                    onChange={(e) => setFilterBranchId(e.target.value)}
                  >
                    <option value="all">All Branches</option>
                    {availableBranches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-full sm:flex-1 sm:min-w-[140px] sm:max-w-[200px]">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Subject, faculty..."
                    className="w-full rounded-md border border-border bg-white h-8 px-2.5 text-xs outline-none focus:border-brand-600"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Action Controls */}
              {canEdit && (
                <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-4 border-t sm:border-t-0 sm:border-l border-border sm:pl-2.5">
                  <select
                    className="h-8 rounded border border-border bg-slate-50 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand-600 cursor-pointer"
                    value={quickLevel}
                    onChange={(e) => setQuickLevel(e.target.value as "college" | "course" | "branch")}
                  >
                    <option value="branch">
                      Branch Level
                    </option>
                    <option value="course">
                      Course Level
                    </option>
                    <option value="college">
                      College Level
                    </option>
                  </select>
                  <Button
                    size="sm"
                    disabled={savingRule}
                    onClick={() => void handleQuickSaveAccess(true)}
                    className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 whitespace-nowrap cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Enable Access
                  </Button>
                  <Button
                    size="sm"
                    disabled={savingRule}
                    variant="secondary"
                    onClick={() => void handleQuickSaveAccess(false)}
                    className="h-8 text-red-700 border-red-300 hover:bg-red-50 text-xs px-2.5 whitespace-nowrap cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Disable Access
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Table */}
          {loading ? (
            <LoadingAnimation label="Loading academic hierarchy & access rules..." />
          ) : error ? (
            <DataErrorState message={error} />
          ) : filteredHierarchy.length === 0 ? (
            <EmptyState title="No subjects found" description="No academic subjects found for the selected filters." />
          ) : (
            <div className="space-y-2">
              {/* Bulk Actions Banner */}
              {selectedRowIds.size > 0 && canEdit && (
                <div className="flex flex-wrap items-center justify-between bg-brand-50 border border-brand-200 rounded-lg p-2.5 px-4 text-xs mb-3 shadow-xs">
                  <div className="font-semibold text-brand-900">
                    {selectedRowIds.size} subject row(s) selected
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={savingRule}
                      onClick={() => void handleBulkAccess(true)}
                      className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-3"
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Enable Access for Selected ({selectedRowIds.size})
                    </Button>
                    <Button
                      size="sm"
                      disabled={savingRule}
                      variant="secondary"
                      onClick={() => void handleBulkAccess(false)}
                      className="h-8 text-red-700 border-red-300 hover:bg-red-50 text-xs px-3"
                    >
                      <X className="h-3.5 w-3.5 mr-1" />
                      Disable Access for Selected ({selectedRowIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedRowIds(new Set())}
                      className="h-8 text-slate-600 text-xs"
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-xs">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-border">
                    <tr>
                      <th className="px-3 py-3 w-10 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer"
                          checked={
                            filteredHierarchy.length > 0 &&
                            selectedRowIds.size === filteredHierarchy.length
                          }
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th className="px-4 py-3">College / Course / Branch</th>
                      <th className="px-4 py-3">Subject & Code</th>
                      <th className="px-4 py-3">Assigned Faculty</th>
                      <th className="px-4 py-3">Internal Marks Upload Access</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredHierarchy.map((item, idx) => {
                      const itemKey = getItemKey(item);
                      const isRowSelected = selectedRowIds.has(itemKey);
                      return (
                        <tr
                          key={`${itemKey}-${idx}`}
                          className={`hover:bg-slate-50/80 transition ${
                            isRowSelected ? "bg-brand-50/40" : ""
                          }`}
                        >
                          <td className="px-3 py-3 align-top text-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500 cursor-pointer mt-1"
                              checked={isRowSelected}
                              onChange={() => toggleSelectRow(itemKey)}
                            />
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-semibold text-navy-900">{item.collegeName}</div>
                            <div className="text-xs text-slate-500">
                              {item.courseName} • {item.branchName}
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-slate-900">{item.subjectName}</div>
                            <div className="text-xs font-mono text-slate-500">
                              {item.subjectCode} ({item.subjectType || "Theory"})
                            </div>
                          </td>

                          <td className="px-4 py-3 align-top">
                            {item.assignedFaculty.length > 0 ? (
                              <div className="space-y-1.5">
                                {item.assignedFaculty.map((f) => (
                                  <div
                                    key={f.staffLinkId}
                                    className="flex items-center justify-between text-xs gap-3 py-1 border-b border-slate-100 last:border-0"
                                  >
                                    <div>
                                      <span className="font-medium text-slate-800">{f.displayName}</span>
                                      {f.employeeCode ? (
                                        <span className="text-slate-400 font-mono ml-1">({f.employeeCode})</span>
                                      ) : null}
                                    </div>
                                    {canEdit ? (
                                      f.accessStatus === "enabled" ? (
                                        <button
                                          type="button"
                                          disabled={savingRule}
                                          onClick={() => void handleToggleIndividualFacultyAccess(item, f.staffLinkId, false)}
                                          className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 transition"
                                        >
                                          Active
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={savingRule}
                                          onClick={() => void handleToggleIndividualFacultyAccess(item, f.staffLinkId, true)}
                                          className="inline-flex items-center rounded px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-300 transition"
                                        >
                                          Inactive
                                        </button>
                                      )
                                    ) : (
                                      <span
                                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                                          f.accessStatus === "enabled"
                                            ? "bg-green-100 text-green-800"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        {f.accessStatus === "enabled" ? "Active" : "Inactive"}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No faculty assigned</span>
                            )}
                          </td>

                          <td className="px-4 py-3 align-top">
                            {item.groupAccessStatus === "enabled" ? (
                              <StatusBadge status="Active" />
                            ) : item.groupAccessStatus === "mixed" ? (
                              <StatusBadge status="Pending" />
                            ) : (
                              <StatusBadge status="Inactive" />
                            )}
                          </td>

                          <td className="px-4 py-3 align-top text-right">
                            {canEdit ? (
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {item.groupAccessStatus === "enabled" ? (
                                  <Button
                                    size="sm"
                                    disabled={savingRule}
                                    variant="secondary"
                                    onClick={() => void handleToggleSubjectRowAccess(item, false)}
                                    className="h-8 text-red-700 border-red-300 hover:bg-red-50 text-xs px-3 font-semibold whitespace-nowrap"
                                  >
                                    Set Inactive
                                  </Button>
                                ) : item.groupAccessStatus === "disabled" ? (
                                  <Button
                                    size="sm"
                                    disabled={savingRule}
                                    onClick={() => void handleToggleSubjectRowAccess(item, true)}
                                    className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-3 font-semibold whitespace-nowrap"
                                  >
                                    Set Active
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      size="sm"
                                      disabled={savingRule}
                                      onClick={() => void handleToggleSubjectRowAccess(item, true)}
                                      className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs px-2.5 font-semibold whitespace-nowrap"
                                    >
                                      Set Active
                                    </Button>
                                    <Button
                                      size="sm"
                                      disabled={savingRule}
                                      variant="secondary"
                                      onClick={() => void handleToggleSubjectRowAccess(item, false)}
                                      className="h-8 text-red-700 border-red-300 hover:bg-red-50 text-xs px-2.5 font-semibold whitespace-nowrap"
                                    >
                                      Set Inactive
                                    </Button>
                                  </>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">View Only</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Access Rules List (Active Rules Only) */}
      {activeTab === "rules" && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-navy-900">Active Access Rules List</h3>
              <p className="text-xs text-slate-500">
                Displaying all currently active college-wise, course-wise, branch-wise, and individual faculty access rules.
              </p>
            </div>
            <Button size="sm" onClick={() => void fetchData(true)}>Refresh</Button>
          </div>
          {loading ? (
            <LoadingAnimation />
          ) : activeRulesList.length === 0 ? (
            <EmptyState title="No active access rules" description="No active access rules found. Use the Hierarchy tab to enable access." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-border">
                  <tr>
                    <th className="px-4 py-3">Rule ID</th>
                    <th className="px-4 py-3">Scope Level</th>
                    <th className="px-4 py-3">College Name</th>
                    <th className="px-4 py-3">Course / Branch</th>
                    <th className="px-4 py-3">Subject / Batch</th>
                    <th className="px-4 py-3">Faculty / Target</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created At</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {activeRulesList.map((rule) => (
                    <tr key={rule.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">#{rule.id}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-bold uppercase bg-brand-100 text-brand-800">
                          {rule.accessLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 text-xs">
                        {rule.collegeName || "All Colleges"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {rule.courseName ? (
                          <span>
                            {rule.courseName} {rule.branchName ? `• ${rule.branchName}` : "• All Branches"}
                          </span>
                        ) : (
                          <span className="text-slate-400">All Courses</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">
                        {rule.subjectName ? (
                          <div className="font-medium text-slate-900">
                            {rule.subjectName} <span className="font-mono text-slate-400">({rule.subjectCode})</span>
                          </div>
                        ) : (
                          <span className="text-slate-500">{rule.academicYearLabel || "All Batches"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {rule.facultyName ? (
                          <span className="font-semibold text-slate-900">{rule.facultyName}</span>
                        ) : (
                          <span className="text-slate-400 italic">Scope Level Rule</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">{rule.createdAt}</td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => void handleDeleteRule(rule.id)}>
                            Revoke / Remove
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Tab Content 3: Configurable Approval Workflows (Fully Editable) */}
      {activeTab === "workflows" && (
        <Card className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h3 className="text-base font-semibold text-navy-900">Configurable Approval Workflow</h3>
              <p className="text-xs text-slate-500">
                Edit approval levels and role assignments for internal marks submission reviews.
              </p>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="secondary" onClick={handleAddWorkflowLevel} className="h-8 text-xs">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Level
                </Button>
                <Button
                  size="sm"
                  disabled={savingWorkflow}
                  onClick={() => void handleSaveWorkflowConfigs()}
                  className="h-8 bg-brand-600 hover:bg-brand-700 text-white text-xs px-3"
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  {savingWorkflow ? "Saving..." : "Save Workflow"}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {approvalLevels.map((lvl, idx) => (
              <div key={idx} className="flex flex-wrap items-center justify-between rounded-lg border border-border p-3.5 bg-slate-50 gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm">
                    {lvl.levelNumber}
                  </div>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-0.5">
                      Approver Role
                    </label>
                    <select
                      disabled={!canEdit}
                      value={lvl.approverRoleKey}
                      onChange={(e) => handleUpdateWorkflowLevel(idx, "approverRoleKey", e.target.value)}
                      className="w-full rounded border border-border bg-white h-8 px-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand-600"
                    >
                      <option value="hod">HOD (Head of Department)</option>
                      <option value="principal">Principal / Vice Principal</option>
                      <option value="superadmin">Superadmin</option>
                      <option value="academic_incharge">Academic Incharge</option>
                      <option value="exam_cell">Exam Cell Controller</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateWorkflowLevel(idx, "isActive", !lvl.isActive)}
                      className={`inline-flex items-center rounded px-3 py-1 text-xs font-bold transition border ${
                        lvl.isActive
                          ? "bg-green-100 text-green-800 border-green-300"
                          : "bg-slate-200 text-slate-600 border-slate-300"
                      }`}
                    >
                      {lvl.isActive ? "Active" : "Inactive"}
                    </button>
                  ) : (
                    <StatusBadge status={lvl.isActive ? "Active" : "Inactive"} />
                  )}
                  {canEdit && approvalLevels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkflowLevel(idx)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded transition"
                      title="Remove Level"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Tab Content 4: Audit Logs */}
      {activeTab === "audit" && (
        <Card className="p-4">
          <h3 className="text-base font-semibold text-navy-900 mb-3">Internal Marks Module Audit Log</h3>
          {loading ? (
            <LoadingAnimation />
          ) : auditLogs.length === 0 ? (
            <EmptyState title="No audit entries yet" description="All permission changes and marks operations are recorded here." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-500 uppercase border-b border-border">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Timestamp</th>
                    <th className="px-3 py-2">User</th>
                    <th className="px-3 py-2">Action</th>
                    <th className="px-3 py-2">Entity</th>
                    <th className="px-3 py-2">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono">#{log.id}</td>
                      <td className="px-3 py-2 text-slate-500">{log.createdAt}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{log.actorName}</td>
                      <td className="px-3 py-2 font-semibold text-brand-700">{log.action}</td>
                      <td className="px-3 py-2 text-slate-600">{log.entityType} #{log.entityId || "—"}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-slate-500">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Configure Access Modal with Interactive Selections */}
      {modalState.open && (
        <Modal
          title="Configure Internal Marks Access Selection"
          onClose={() => setModalState((prev) => ({ ...prev, open: false }))}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                1. Select Access Hierarchy Level
              </label>
              <select
                className="w-full rounded-md border border-border bg-white p-2.5 text-sm font-semibold text-brand-900 outline-none focus:border-brand-600"
                value={modalState.level}
                onChange={(e) =>
                  setModalState((prev) => ({
                    ...prev,
                    level: e.target.value as "college" | "course" | "branch" | "individual",
                  }))
                }
              >
                <option value="college">Level 1 — College Level (Access for faculty across selected college)</option>
                <option value="course">Level 2 — Course Level (Access for faculty belonging to a course)</option>
                <option value="branch">Level 3 — Branch Level (Access for faculty belonging to a branch)</option>
                <option value="individual">Level 4 — Individual Subject & Faculty Level (Specific subject/faculty)</option>
              </select>
            </div>

            {/* Selection 1: College */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                2. Select College
              </label>
              <select
                className="w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus:border-brand-600"
                value={modalState.selectedCollegeId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setModalState((prev) => ({
                    ...prev,
                    selectedCollegeId: val,
                    selectedCourseId: null,
                    selectedBranchId: null,
                  }));
                }}
              >
                <option value="">-- Select College --</option>
                {masters.colleges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Selection 2: Course (Required for Level 2, 3, 4) */}
            {(modalState.level === "course" || modalState.level === "branch" || modalState.level === "individual") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  3. Select Course
                </label>
                <select
                  className="w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus:border-brand-600"
                  value={modalState.selectedCourseId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setModalState((prev) => ({
                      ...prev,
                      selectedCourseId: val,
                      selectedBranchId: null,
                    }));
                  }}
                >
                  <option value="">-- Select Course --</option>
                  {modalCourses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selection 3: Branch (Required for Level 3, 4) */}
            {(modalState.level === "branch" || modalState.level === "individual") && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  4. Select Branch
                </label>
                <select
                  className="w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus:border-brand-600"
                  value={modalState.selectedBranchId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setModalState((prev) => ({
                      ...prev,
                      selectedBranchId: val,
                    }));
                  }}
                >
                  <option value="">-- Select Branch --</option>
                  {modalBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selection 4 & 5: Subject and Faculty (Required for Level 4 Individual) */}
            {modalState.level === "individual" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    5. Select Subject
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus:border-brand-600"
                    value={modalState.selectedSubjectId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setModalState((prev) => ({
                        ...prev,
                        selectedSubjectId: val,
                      }));
                    }}
                  >
                    <option value="">-- Select Subject --</option>
                    {uniqueModalSubjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    6. Select Faculty Member
                  </label>
                  <select
                    className="w-full rounded-md border border-border bg-white p-2 text-sm outline-none focus:border-brand-600"
                    value={modalState.selectedFacultyId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : null;
                      setModalState((prev) => ({
                        ...prev,
                        selectedFacultyId: val,
                      }));
                    }}
                  >
                    <option value="">-- Select Faculty --</option>
                    {uniqueModalFaculty.map((f) => (
                      <option key={f.staffLinkId} value={f.staffLinkId}>
                        {f.displayName} {f.employeeCode ? `(${f.employeeCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-900 space-y-1">
              <span className="font-semibold uppercase text-blue-800">Target Selection Summary:</span>
              <div>
                Level: <span className="font-bold capitalize">{modalState.level}</span> | College:{" "}
                {masters.colleges.find((c) => c.id === modalState.selectedCollegeId)?.name || "All / Unspecified"} | Course:{" "}
                {masters.courses.find((c) => c.id === modalState.selectedCourseId)?.name || "All / Unspecified"} | Branch:{" "}
                {masters.branches.find((b) => b.id === modalState.selectedBranchId)?.name || "All / Unspecified"}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-3">
              <Button
                disabled={savingRule}
                onClick={() => void handleSaveAccessRule(true)}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {savingRule ? "Saving..." : "Enable Upload Access"}
              </Button>
              <Button
                disabled={savingRule}
                variant="secondary"
                onClick={() => void handleSaveAccessRule(false)}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                Disable Upload Access
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
