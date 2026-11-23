/* Fictional reference data used to generate the synthetic dataset. */
var SeedData = {
  FIRST: ["Avery", "Jordan", "Priya", "Mateo", "Hana", "Liam", "Sofia", "Kofi", "Elena", "Ravi", "Noor", "Daniel", "Mei", "Lucas", "Amara", "Tomas", "Isla", "Arjun", "Camila", "Owen", "Yara", "Felix", "Leila", "Marcus", "Zara", "Diego", "Anya", "Samuel", "Ines", "Kenji"],
  LAST: ["Whitfield", "Moreno", "Castell", "Okafor", "Lindqvist", "Ramanathan", "Delacroix", "Nakamura", "Brennan", "Haddad", "Vasquez", "Kowalski", "Fairbanks", "Mensah", "Albright", "Sato", "Quintero", "Devlin", "Ashford", "Petrov"],

  APPS: [
    { app: "Payments Hub", id: "140211", funcs: ["WIRE_RELEASE_APPROVER", "BENEFICIARY_MAINT"], ent: "Approve and release outgoing wire payments above desk limits" },
    { app: "Core Ledger", id: "141580", funcs: ["GL_JOURNAL_POSTER", "PERIOD_CLOSE_OVERRIDE"], ent: "Post manual journal entries to the general ledger" },
    { app: "External Email Gateway", id: "147396", funcs: ["INBOUND_OUTBOUND", "INBOUND_OUTBOUND_SMALL"], ent: "Send and receive email to external domains" },
    { app: "Identity Console", id: "150323", funcs: ["PRIVILEGED_ADMIN", "ROLE_APPROVER"], ent: "Administer privileged directory groups" },
    { app: "Trade Capture", id: "151042", funcs: ["EXTERNAL_FILE_TRANSFER", "LIMIT_OVERRIDE"], ent: "Transfer trade files to external counterparties" },
    { app: "Enterprise Data Warehouse", id: "152906", funcs: ["PROD_READ_ALL", "DEV_WRITE"], ent: "Read access to all production data marts" },
    { app: "Disputes Workflow", id: "155527", funcs: ["DISPUTE_CREDIT_ISSUER"], ent: "Issue provisional credits on card disputes" },
    { app: "Client Onboarding Portal", id: "158804", funcs: ["KYC_OVERRIDE", "ACCOUNT_ACTIVATE"], ent: "Override KYC checklist items during onboarding" },
  ],

  ORGS: [
    { country: "United States", region: "NA", sector: "Corporate Functions", segment: "Finance" },
    { country: "United States", region: "NA", sector: "Technology", segment: "Infrastructure" },
    { country: "Mexico", region: "LATAM", sector: "Retail Banking", segment: "Branch Network" },
    { country: "United Kingdom", region: "EMEA", sector: "Markets", segment: "Trade Operations" },
    { country: "Poland", region: "EMEA", sector: "Technology", segment: "Application Support" },
    { country: "India", region: "APAC", sector: "Operations", segment: "Payments Operations" },
    { country: "Singapore", region: "APAC", sector: "Wealth", segment: "Private Banking" },
    { country: "Brazil", region: "LATAM", sector: "Operations", segment: "Client Onboarding" },
    { country: "Philippines", region: "APAC", sector: "Operations", segment: "Shared Services" },
  ],

  GOOD: [
    { role: "Treasury Payments Analyst", process: "Releases high-value outgoing wires after four-eyes verification and resolves payment repairs for the corporate desk.", comm: "Only two of my eight direct reports release wires; peers handle reconciliations and do not need release rights (maker/checker segregation)." },
    { role: "Senior Financial Controller", process: "Posts and reviews manual adjusting journal entries during month-end close for the regional legal entities.", comm: "Peers work on forecasting and never post journals; this controller is the designated poster for the region." },
    { role: "Maintenance Technician", process: "Communicates with external vendors and building managers to confirm appointments for licensed repair work.", comm: "Technicians do not normally need external email; this worker backs up the team lead when they are out of office." },
    { role: "IAM Engineer", process: "Administers privileged directory groups and executes approved access changes raised through change tickets.", comm: "Peers on the team handle access reviews only; this engineer is one of two assigned to privileged group administration." },
    { role: "Trade Settlement Analyst", process: "Sends daily trade confirmation files to the clearing counterparty and investigates rejected files.", comm: "Peers cover other regions; only this analyst supports the EMEA clearing link, with a named backup." },
    { role: "DBA", process: "Applies patches and monitors performance of production data marts during approved change windows.", comm: "Only the two DBAs on my team are assigned to this platform; peers support other databases." },
    { role: "Disputes Specialist", process: "Reviews card dispute evidence and issues provisional credits within regulatory timelines.", comm: "Peers handle intake only; this specialist is dedicated to credit decisions to keep segregation of duties." },
    { role: "Onboarding Team Lead", process: "Approves KYC exceptions for corporate clients after compliance sign-off and documents the rationale.", comm: "Least privilege: as team lead she is the only one of nine direct reports authorised to approve exceptions; peers prepare files." },
    { role: "Priority Banker", process: "Activates new accounts for priority clients and verifies identification documents in the onboarding portal.", comm: "Most colleagues serve the mass segment; this banker is the specialist for priority clients in the branch." },
    { role: "Application Support Engineer", process: "Troubleshoots production incidents and monitors overnight batch jobs for the ledger application.", comm: "Peers support other applications; this engineer is the primary on-call for the ledger, with one backup." },
  ],

  BAD: {
    R1: [
      { role: "Gerente de sucursal", process: "Es el responsable de autorizar las operaciones de la sucursal y requiere acceso para enviar reportes.", comm: "Es el único gerente en el equipo que realiza esta función." },
      { role: "Banquero asociado", process: "Se requiere el acceso para realizar la apertura de cuentas de los clientes.", comm: "La mayoría de los banqueros no tienen este acceso." },
    ],
    R2: [
      { role: "Operations Analyst", process: "BAU", comm: "Peers in the region do not process these items; only this analyst covers the team." },
      { role: "Payments Associate", process: "Needed for daily work", comm: "Colleagues handle other queues; this worker is the backup for the supervisor." },
    ],
    R3: [
      { role: "Finance Analyst", process: "Prepares accruals and posts adjusting entries for the regional cost centres at month end.", comm: "Small team" },
      { role: "Reconciliation Analyst", process: "Reconciles nostro balances and investigates breaks for the payments desk.", comm: "Everyone needs access" },
    ],
    R4: [{ role: "Data Engineer", process: "Builds and maintains data pipelines for the risk reporting data mart", comm: "Builds and maintains data pipelines for the risk reporting data mart" }],
    R5: [{ role: "SSU", process: "Needed for daily work", comm: "Small team" }],
    R6: [
      { role: "AD_Group_Member", process: "Monitors overnight batch jobs for the settlements platform and restarts failed jobs.", comm: "Peers work day shifts; this worker covers nights." },
      { role: "TLM Recon Portal", process: "Matches settlement breaks and escalates aged items to the desk.", comm: "Peers cover other currencies; this worker owns USD breaks." },
    ],
    R10: [{ role: "Contractor", process: "Migrates legacy disputes data into the new workflow tool and validates record counts after each load.", comm: "Peers are permanent staff on BAU queues; this contractor is dedicated to the migration project only." }],
    R11: [{ role: "VCG D&E", process: "Designs valuation execution strategies and maintains pricing models used by valuation control.", comm: "Peers focus on reporting; only this specialist maintains the pricing models." }],
  },

  TEMPLATES: ["Access is required for their job function", "Access is required for their job function", "Access is required for their job function", "This person is a backup for another worker"],
  FREQ: ["Daily", "Daily", "Weekly", "Monthly", "Adhoc", "Quarterly"],
};
