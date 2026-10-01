// Guided VDD workflows exposed as MCP prompts. Mirrored by api/_vdd-rpc.js PROMPTS
// for the hosted endpoint; packages/vdd-mcp/test/api-surface.test.ts asserts parity.

export interface VddPromptArg {
  name: string;
  description: string;
  required: boolean;
}

export interface VddPrompt {
  name: string;
  title: string;
  description: string;
  arguments: VddPromptArg[];
  text: (a: Record<string, string | undefined>) => string;
}

export const PROMPTS: VddPrompt[] = [
  {
    name: "start_vdd_project",
    title: "Start a VDD project",
    description: "Run the VDD chain from a vision statement to a test-first task list, gate by gate.",
    arguments: [
      { name: "vision", description: "Freeform 1-3 paragraph vision: who it is for, the change you want, how you will measure it.", required: true },
      { name: "projectRoot", description: "Project root to write constitution.md and vdd/ into (default \".\").", required: false },
    ],
    text: (a) => `Use the Vision Driven Design (VDD) tools to take this vision to a validated task list.\n\nVision:\n${a.vision}\n\nUse projectRoot="${a.projectRoot || "."}" on every call.\n1. vdd_detect_environment with your availableTools, and note any missing tools.\n2. vdd_init.\n3. vdd_vision with statement = the vision above.\n4. vdd_strategize with availableTools; run the research subagents it returns, then call it again with researchFindings.\n5. vdd_tactics.\n6. vdd_specify with actionItemId for the top Must-have item from vdd/tactics.md (use a kebab-case feature name).\n7. vdd_clarify with that feature; resolve every item it returns, then edit the spec.\n8. vdd_plan, then vdd_tasks, for the same feature.\n9. vdd_validate.\n\nAfter each step, report the gate result. Stop and ask me when a gate fails or an input is ambiguous.`,
  },
  {
    name: "implement_next_task",
    title: "Implement the next VDD task",
    description: "Pick the next uncompleted task for a feature, implement it test-first, and keep traceability.",
    arguments: [
      { name: "feature", description: "Spec directory name under vdd/specs/ (kebab-case).", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Implement the next task for feature "${a.feature}" with Vision Driven Design (projectRoot="${a.projectRoot || "."}").\n1. vdd_get_next_task with feature="${a.feature}".\n2. vdd_implement with the returned taskId; follow its instruction exactly.\n3. Write the failing test first, then the code, then run the tests.\n4. Commit using the impact-chain commit-message format vdd_implement returned, and tick the task in tasks.md.\n5. vdd_inspect with scope="feature" and feature="${a.feature}" to confirm coverage.\n\nDo one task only, then stop and summarise what changed.`,
  },
  {
    name: "change_requirement",
    title: "Change a requirement",
    description: "Cascade a requirement change down the V→S→T→SP→PL→TK chain and re-run the affected gates.",
    arguments: [
      { name: "change", description: "The requirement change, in plain language.", required: true },
      { name: "projectRoot", description: "Project root (default \".\").", required: false },
    ],
    text: (a) => `Apply this requirement change with Vision Driven Design (projectRoot="${a.projectRoot || "."}"):\n\n${a.change}\n\n1. vdd_amend with description = the change above.\n2. Apply its ordered steps from the highest affected level downward; edit each artifact yourself.\n3. Re-run the gates it lists with vdd_validate.\n4. vdd_inspect (scope="project") to confirm no orphaned or drifting links.\n\nShow me the cascade plan before editing anything.`,
  },
];
