---

name: project-diagrams
description: Analyze a software project and create accurate, implementation-specific technical diagrams from its actual architecture, code, data, workflows, interfaces, and infrastructure.
compatibility: opencode
-----------------------

# Project Diagrams

Create professional technical diagrams from the **actual project**.

The project repository is the primary source of truth.

Do not generate diagrams from assumptions, generic templates, or a fixed diagram checklist.

The goal is not to create many diagrams. The goal is to create the **right diagrams that explain the system clearly and accurately**.

---

## 1. Start With the System

Before creating diagrams:

1. Read applicable `AGENTS.md` files.
2. Inspect project documentation.
3. Inspect repository structure.
4. Identify the actual technologies and architecture.
5. Inspect application modules and major components.
6. Inspect database/schema definitions.
7. Inspect APIs/interfaces.
8. Inspect important workflows.
9. Inspect authentication/security boundaries where relevant.
10. Inspect background jobs, queues, workers, integrations, and infrastructure where relevant.
11. Check existing diagrams and determine whether they are still accurate.

Build an internal model of the system before deciding what to draw.

Do not start by selecting diagram types.

---

## 2. Think Like a Software Engineer

For every possible diagram, ask:

* What concept needs to be explained?
* Who will read the diagram?
* What information must the reader understand?
* Is the information supported by the repository?
* What is the simplest standard diagram that communicates it?
* Would another diagram communicate it better?
* Does an existing diagram already explain it?
* Is the diagram useful enough to justify inclusion?

Choose the diagram based on the **information being communicated**, not on the name of a diagram type.

---

## 3. Diagram Selection

If the user explicitly requests a diagram type, create that type unless it is technically inappropriate.

If the user does not specify a diagram type:

1. Identify the concept they need explained.
2. Determine the most appropriate conventional diagram.
3. Generate that diagram.

Use normal, widely understood engineering notation.

Possible diagram families include, but are not limited to:

* architecture
* component
* deployment
* context
* data flow
* entity relationship
* class
* object
* sequence
* activity
* state
* workflow/process
* use case
* dependency
* network/infrastructure
* data model
* interaction
* lifecycle
* other domain-appropriate technical diagrams

This is an **open-ended set**, not a checklist.

Do not force a UML diagram where a simple architecture or process diagram communicates the concept better.

---

## 4. Make the Diagram Project-Specific

A diagram must reflect the actual project.

Use real:

* modules
* services
* applications
* components
* actors
* entities
* tables
* interfaces
* APIs
* queues
* workers
* storage systems
* external systems
* workflows
* relationships

Use names from the project where they improve accuracy.

Do not replace real architecture with generic labels such as:

```text
Frontend
Backend
Database
```

when the repository provides more meaningful structure.

At the same time, do not expose implementation details that are irrelevant to the diagram's purpose.

---

## 5. Choose the Right Abstraction Level

A professional diagram should show the correct amount of detail.

### Too abstract

Avoid diagrams that communicate almost nothing:

```text
User → System → Database
```

when the system has meaningful internal structure that the requested concept depends on.

### Too detailed

Avoid diagrams containing every:

* file
* function
* endpoint
* variable
* database column
* framework package
* configuration option

unless the user explicitly asks for that level.

### Correct level

Include the smallest set of elements needed to explain the target concept accurately.

---

## 6. One Diagram, One Purpose

Every diagram should have a clear purpose.

Examples:

* architecture → system structure
* sequence → interaction order
* activity → process logic
* ER → data relationships
* deployment → runtime placement
* component → software component relationships
* DFD → data movement
* state → lifecycle transitions
* use case → actor/system interactions

Do not mix unrelated concerns merely to make a diagram look comprehensive.

If two concepts are substantially different, use two diagrams.

If two diagrams would communicate the same information, keep the clearer one.

---

## 7. Context and Boundary

Make system boundaries explicit when relevant.

Clearly distinguish:

* users
* internal components
* external systems
* databases
* infrastructure
* third-party services
* trusted/untrusted boundaries

Do not imply that an external service is part of the application.

Do not imply direct communication between components when the implementation uses an intermediary.

---

## 8. Data Accuracy

When creating data-related diagrams, inspect the actual schema.

For ER diagrams and database models:

* use actual entities/tables;
* use actual relationships;
* respect foreign keys;
* distinguish one-to-one, one-to-many, and many-to-many relationships;
* avoid adding fields merely because they are common;
* do not invent normalization or constraints.

For class diagrams:

* derive classes and relationships from actual implementation;
* do not automatically turn every database table into a class;
* do not include framework internals unless relevant.

---

## 9. Workflow Accuracy

For process, activity, and sequence diagrams:

Trace the actual workflow.

Include relevant:

* actors
* requests
* responses
* validation
* decisions
* asynchronous processing
* persistence
* error paths
* external interactions

Do not invent steps merely because they would be desirable.

If the implementation is asynchronous, represent the asynchronous boundary accurately.

If a workflow has meaningful failure handling, show it when it improves understanding.

---

## 10. Architecture Accuracy

Architecture diagrams must represent the actual implemented architecture.

Distinguish between:

* application processes
* modules
* services
* databases
* queues
* workers
* external dependencies
* storage
* network boundaries
* deployment infrastructure

Do not call something a microservice unless the implementation supports that description.

Do not represent a modular monolith as multiple independently deployed services.

Do not represent a planned architecture as the current architecture.

If the user explicitly asks for a proposed/future architecture, label it clearly as proposed or future.

---

## 11. Existing Diagrams

Before generating a diagram:

1. Find existing diagram source.
2. Check whether it represents the current implementation.
3. Reuse accurate diagrams.
4. Update outdated diagrams.
5. Replace inaccurate diagrams rather than preserving incorrect information.

Do not create duplicate diagrams unnecessarily.

If an existing diagram is useful but poorly structured, improve it while preserving factual accuracy.

---

## 12. Diagram Style

Use a professional technical-documentation style.

Prioritize:

* clarity
* hierarchy
* readable labels
* consistent spacing
* logical flow
* minimal visual noise
* conventional notation

Do not use decorative artwork.

Do not create marketing-style diagrams.

Do not use unnecessary icons or illustrations.

The diagram should still make sense when printed in black and white.

---

## 13. Black-and-White Compatibility

When diagrams are intended for an academic report or formal technical documentation, default to monochrome.

Prefer:

* black lines
* black text
* white backgrounds
* simple grayscale when required

Do not rely on color to communicate meaning.

If color is used for a separately requested presentation diagram, ensure the semantic meaning remains understandable without color unless the user explicitly requires color-dependent encoding.

For black-book documentation, produce monochrome diagrams.

---

## 14. Diagram Source

Prefer editable diagram source.

Use Mermaid when it can accurately represent the required diagram.

Keep source separate from rendered output.

Recommended structure:

```text
docs/diagrams/
├── README.md
├── source/
├── svg/
└── png/
```

Preserve the repository's existing diagram structure if one exists.

Do not create duplicate directory structures unnecessarily.

---

## 15. Mermaid

When Mermaid is appropriate:

* create readable `.mmd` source;
* use meaningful node names;
* keep relationships clear;
* avoid unnecessarily large diagrams;
* use subgraphs where they improve architecture comprehension;
* use standard Mermaid diagram types appropriate to the concept.

Do not force Mermaid when another diagram representation is substantially more suitable.

For example, use another supported format when Mermaid cannot express the required notation clearly or accurately.

---

## 16. Rendering

If Mermaid source is used and Mermaid CLI is available, render it to the repository's expected output format.

For example:

```bash
mmdc -i source/example.mmd -o svg/example.svg
```

Use the project's existing rendering configuration when available.

Do not assume that successful Mermaid parsing means the diagram is visually good.

Inspect rendered diagrams when possible.

---

## 17. Validation

Validate every diagram before considering it complete.

### Technical validation

Check:

* every component exists;
* every relationship is supported;
* names match the project;
* directions of communication are correct;
* data relationships are correct;
* actors are correct;
* boundaries are correct;
* no obsolete components remain.

### Visual validation

Check:

* no overlapping nodes;
* no clipped labels;
* readable text;
* sensible spacing;
* clear flow direction;
* no unnecessary crossings;
* no excessive diagram size;
* no accidental color;
* no ambiguous arrows.

A diagram that is technically correct but unreadable is not finished.

---

## 18. Documentation Integration

When a diagram is intended for a report or documentation:

Provide:

1. diagram source;
2. rendered diagram;
3. meaningful title/caption;
4. short explanation of what the diagram demonstrates.

The explanation should add context rather than repeat every label.

For example:

```text
Figure: System Architecture

[diagram]

The architecture separates the presentation, application, persistence,
and asynchronous processing responsibilities. Requests are handled by
the application layer while long-running processing is delegated to
the appropriate background component.
```

Only describe relationships supported by the actual project.

---

## 19. User Requests

If the user says:

> Create a diagram for X

first determine what X represents.

If X is clear from the repository, proceed.

If multiple interpretations would produce materially different diagrams, ask a concise clarification.

If the user says:

> Create the diagrams for the project

analyze the project and select the useful diagram set yourself.

Do not ask the user to choose from a long list of diagram types unless the project evidence genuinely leaves the choice ambiguous.

---

## 20. Documentation-Driven Generation

When another skill requests diagrams, provide diagrams appropriate to that skill's purpose.

For example, a report/documentation skill may request diagrams without specifying exact types.

In that situation:

1. inspect the project;
2. identify concepts that require visual explanation;
3. select suitable diagrams;
4. generate only the useful ones;
5. return the source and rendered outputs.

Do not require the calling skill to provide a fixed diagram checklist.

---

## 21. Proposed vs Current Systems

Never mix current and proposed architecture.

If both are needed:

* create separate diagrams;
* label them clearly;
* base the current diagram on implementation;
* base the proposed diagram on explicit requirements or approved design.

Do not silently turn future plans into current architecture.

---

## 22. Change Awareness

When the project changes:

1. inspect the affected implementation;
2. identify diagrams affected by the change;
3. update only those diagrams;
4. render them again;
5. validate them.

Do not regenerate unrelated diagrams.

---

## 23. Completion

After generating diagrams, report briefly:

* diagrams created
* diagrams updated
* diagrams intentionally not created
* source locations
* rendered output locations
* validation status
* any unresolved ambiguity or missing project evidence

Do not claim a diagram is accurate if the repository did not provide enough evidence to establish its content.
