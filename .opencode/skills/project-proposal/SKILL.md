---

name: project-proposal
description: Create, update, review, and compile a formal academic software project proposal from the actual repository, project requirements, and approved academic information.
compatibility: opencode
-----------------------

# Project Proposal Skill

Create a formal academic project proposal using the actual software project as the technical source of truth and the institution's official requirements as the documentation source of truth.

## Core Principle

Behave like a professional software engineer preparing a proposal **before project implementation is considered complete**.

Never invent:

* project features
* technologies
* architecture
* team members
* guide names
* roll numbers
* dates
* institutions
* results
* statistics
* approvals
* references
* implementation status

If required academic information is unavailable, ask for it before final generation.

Do not use placeholders such as `[PLACEHOLDER]`. If the user explicitly chooses to proceed without missing information, leave the corresponding field blank and report the missing information.

## Workflow

### 1. Understand the Project

Inspect the repository and relevant documentation before writing.

Read, when available:

* `AGENTS.md`
* project status/task documentation
* existing proposal
* README/documentation
* source code
* database/schema
* APIs
* modules
* configuration
* infrastructure
* existing diagrams
* relevant project requirements

Treat the actual repository as the technical source of truth.

Do not describe functionality merely because it appears in a roadmap or idea document if the repository provides contradictory evidence.

### 2. Understand Academic Requirements

Use the institution's official project guidelines as the formatting and structural authority.

For the supplied USCSP505/USCSP605 guidelines, the proposal must contain:

1. Title
2. Introduction
3. Objectives
4. Scope
5. Methodology
6. Tools and Technologies
7. Timeline
8. Resources
9. Expected Outcomes
10. References

The proposal is prepared **before the project is completed**, so descriptions must represent the proposed project rather than falsely reporting completed implementation.

### 3. Use Existing Proposal

If a proposal already exists:

* inspect it first
* preserve valid information
* update rather than create a competing proposal
* maintain consistency with the actual project
* correct only information that is unsupported or outdated

Use the `project-diagrams` skill when diagrams are required.

### 4. Academic Information

Collect required information that cannot be reliably obtained from the repository, such as:

* official project title
* student name(s)
* roll number(s), if required
* course/program
* semester
* academic year
* institution/college name
* department
* project guide
* submission/proposal date
* semester start and end dates, when required for the timeline

Ask concise questions for missing required information.

Never infer academic identities or institutional information.

## Proposal Timeline

The timeline represents the **planned project schedule at proposal time**.

Do not generate a timeline from the current Git history or completed implementation work.

### Recommended Timeline Model

When the project is a semester project, plan the timeline from:

**Start of semester → End of semester**

Use the actual semester dates when they are known.

If the semester dates are not known, ask the user for:

* semester start date
* semester end date

If exact dates are not required or unavailable, use academic phases/weeks instead of inventing calendar dates.

### Timeline Planning

Create a realistic sequence such as:

* Problem identification and requirements
* Requirement analysis
* System analysis and planning
* System design
* Database/API/UI design as applicable
* Core development
* Feature development and integration
* Testing and debugging
* Documentation
* Final review and submission

The exact phases must be adapted to the actual project.

Do not blindly use this list if the project requires a different development process.

The timeline should show **planned work**, not claim that the work has already happened.

Avoid overly precise day-by-day schedules unless the user provides them.

### Timeline Consistency

Ensure the timeline:

* fits within the semester
* allows time for testing and debugging
* allows time for documentation
* leaves reasonable time for final review/submission
* reflects the actual project scope
* does not promise unsupported features
* does not imply completed work at proposal stage

If the project is already underway when the proposal is being updated, preserve the distinction between:

**planned proposal schedule** and **actual project progress**.

Do not silently rewrite the original proposal timeline to match completed work.

## Technical Content

Describe the proposed system at an appropriate academic level.

Include only technologies and architecture supported by the project or explicitly confirmed by the user.

Explain:

* what problem the project addresses
* what the proposed system will provide
* major functional scope
* major technical approach
* development methodology
* expected deliverables/outcomes

Do not turn the proposal into a detailed implementation report.

Implementation-level details belong primarily in the black book.

## Methodology

Select a methodology that accurately reflects the proposed development process.

Do not claim a methodology merely because it is academically common.

If the repository/documentation does not establish the methodology, ask the user or describe the development approach without falsely assigning a formal methodology.

## Tools and Technologies

List actual or explicitly selected technologies.

Group them logically where useful, for example:

* Frontend
* Backend
* Database
* APIs
* Infrastructure
* Development tools
* Testing tools

Do not add technologies simply because they would be suitable.

## Expected Outcomes

Describe expected deliverables and capabilities.

Do not report:

* achieved performance
* completed testing results
* user statistics
* accuracy percentages
* deployment results
* production adoption

unless such evidence already exists and the proposal is specifically being updated after those facts became available.

Use future-oriented academic language for genuinely expected outcomes.

## References

Use legitimate references relevant to the actual project.

Do not fabricate citations.

Prefer authoritative documentation, academic sources, standards, or other sources actually relevant to the project.

Maintain the required institutional citation style, such as IEEE/Springer, when specified.

## Document Format

For the supplied academic guidelines:

* 12 pt Times New Roman
* single spacing
* formal academic presentation
* chapter/section headings follow the institution's requirements where applicable
* no decorative or marketing-oriented design
* black-and-white presentation

Use XeLaTeX when Times New Roman compatibility is required.

Use:

```latex
\usepackage[hidelinks]{hyperref}
```

Do not use colored hyperlinks.

Do not introduce colored headings, backgrounds, decorative boxes, or unnecessary visual elements.

## Structure

Keep the proposal focused on the required proposal sections.

Do not automatically copy the black-book chapter structure into the proposal.

The proposal and black book are separate documents with different purposes:

**Proposal:** what is planned and why.

**Black book:** what was designed, implemented, tested, and documented.

## Output

Use the existing proposal structure when available.

Otherwise use:

```text
docs/proposal/
├── main.tex
├── references.bib
├── sections/
└── output/
```

Keep reusable content modular where practical.

Compile using:

```bash
latexmk -xelatex -interaction=nonstopmode main.tex
```

## Validation

Before completion, verify:

### Academic

* Required proposal sections exist.
* Required academic information is correct.
* No fabricated information exists.
* Timeline represents the planned semester schedule.
* References are legitimate.

### Technical

* Project description matches the repository.
* Technologies match the actual or explicitly approved project.
* Scope is realistic.
* Methodology is not falsely claimed.
* Expected outcomes are future-oriented where appropriate.

### Formatting

* 12 pt Times New Roman where required.
* Single spacing.
* Black-and-white presentation.
* No colored links.
* No unnecessary decorative elements.
* PDF compiles successfully.

## Final Report

After completing the proposal, report briefly:

* proposal created/updated
* output location
* compilation result
* validation result
* missing academic information, if any
* any fields intentionally left blank
* any assumptions that require user confirmation

Do not claim completion if compilation or validation failed.

