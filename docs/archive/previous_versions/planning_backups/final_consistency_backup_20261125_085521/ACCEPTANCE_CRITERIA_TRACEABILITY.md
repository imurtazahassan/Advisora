# Acceptance Criteria Traceability — Deliverable 4

**Source:** Approved Deliverable 3 PRD  
**Purpose:** Map PRD acceptance criteria to functional requirements and vertical slices.  
**Status:** Coverage mapping prepared; test cases and execution evidence pending.

| Acceptance Criteria | Related Functional Requirement | Vertical Slice | Verification Status |
|---|---|---|---|
| AC-01.1 to AC-01.3 | FR-01, FR-12 | VS-02, VS-03 | Pending test specification |
| AC-02.1 to AC-02.3 | FR-02 | VS-07 | Pending test specification |
| AC-03.1 to AC-03.3 | FR-03 | VS-03, VS-07 | Pending test specification |
| AC-04.1 to AC-04.4 | FR-04 | VS-02, VS-03, VS-05 | Pending test specification |
| AC-05.1 to AC-05.5 | FR-05 | VS-04 | Pending test specification |
| AC-06.1 to AC-06.5 | FR-06 | VS-05, VS-06 | Pending test specification |
| AC-07.1 to AC-07.5 | FR-07 | VS-05, VS-06 | Pending test specification |
| AC-08.1 to AC-08.5 | FR-08, FR-11 | VS-04, VS-05, VS-06 | Pending test specification |
| AC-09.1 to AC-09.4 | FR-09 | VS-04, VS-05 | Pending test specification |
| AC-10.1 to AC-10.4 | FR-10 | VS-04, VS-05, VS-06 | Pending test specification |
| AC-11.1 to AC-11.4 | FR-11 | VS-04, VS-05 | Pending test specification |
| AC-12.1 to AC-12.5 | FR-12 | VS-02, VS-03 | Pending test specification |
| AC-13.1 to AC-13.5 | FR-13 | VS-08 | Pending test specification |
| AC-14.1 to AC-14.5 | FR-14 | VS-06 | Pending test specification |
| AC-15.1 to AC-15.3 | FR-15 | VS-08 | Pending test specification |
| AC-16.1 to AC-16.3 | FR-16 | VS-08 | Pending test specification |
| AC-17.1 to AC-17.3 | FR-17 | VS-08 | Pending test specification |

## Coverage Rules

1. Each criterion must receive one or more test case IDs when test specifications are prepared.
2. Positive, negative, boundary and failure-path behavior must be considered where applicable.
3. Security and authorization criteria require negative tests, including expired, missing, invalid and revoked authorization.
4. Acceptance criteria must be verified against the original PRD wording.
5. A mapped criterion is not automatically implemented, tested or passed.
6. Any requirement-to-criterion mapping change must be recorded and reviewed.

## Important Scope Notes

- AC-08 through AC-11 cover distinct plan lifecycle behavior; their separate FR-08, FR-09, FR-10 and FR-11 responsibilities must remain visible.
- AC-13 Signal Accuracy is measurement-only. The 3% loss threshold does not authorize forced closure.
- AC-14 concerns exchange API-key permissions and is not user login.
- AC-15, AC-16 and AC-17 remain separate supporting modules.
- All exchange and execution tests remain mock/test only. No live trading or real financial transactions.

**Current result:** Traceability mapping prepared. Test-case creation and verification evidence remain outstanding.