/* global Ext */
Ext.define("Constants", {
    statics: {
        ID: {
            ACCEPTED_START_DATE: 'ACCEPTED_START_DATE',
            ACCEPTED_END_DATE: 'ACCEPTED_END_DATE',
            USER_STORY_STORE: 'USER_STORY_STORE',
            SUMMARY_AREA: 'SUMMARY_AREA',
            DETAILS_AREA: 'DETAILS_AREA',
            EXPORT: 'EXPORT',
            TAB_PANEL: 'TAB_PANEL',
        },
        LABEL: {
            ACCEPTED_START_DATE: "Start Date",
            ACCEPTED_END_DATE: "End Date",
            TEAM_NAME: 'Team',
            DELIVERABLE_ID: 'Deliverable',
            EXPENSE_CATEGORY: 'Expense Category',
            PCT_EFFORT: '% of Effort',
            DELIVERABLE_NAME: 'Deliverable Name',
            PI_PROJECT_ID: 'Project',
            PI_PROJECT_NAME: 'Project Name',
            INITIATIVE_ID: 'Initiative',
            INITIATIVE_NAME: 'Initiative Name',
            DELIVERABLE_STATE: 'Closed Deliverable',
            EXPORT: 'Export',
            SUMMARY_AREA: 'Summary',
            DETAILS_AREA: 'Details',
            USER_STORY_ID: 'User Story',
            PARENT: 'User Story Parent',
            ACCEPTED_DATE: 'Accepted Date',
            OWNER: 'Owner'
        },
        USER_STORY_FIELDS: [
            'ObjectID', 'FormattedID', 'Name', 'AcceptedDate', 'Deliverable', 'c_ExpenseCategory',
            'Parent',
            'State',
            'Owner',
            'PlanEstimate',
            'Project',
        ]
    }
})
