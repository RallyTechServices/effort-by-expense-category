/* global Ext */
Ext.define("Constants", {
    statics: {
        ID: {
            ACCEPTED_START_DATE: 'ACCEPTED_START_DATE',
            ACCEPTED_END_DATE: 'ACCEPTED_END_DATE',
            USER_STORY_STORE: 'USER_STORY_STORE',
            TABLE_AREA: 'TABLE_AREA',
        },
        LABEL: {
            ACCEPTED_START_DATE: "Start Date",
            ACCEPTED_END_DATE: "End Date",
            TEAM_NAME: 'Team',
            DELIVERABLE_ID: 'Deliverable'
        },
        USER_STORY_FIELDS: [
            'ObjectID', 'FormattedID', 'Name', 'AcceptedDate', 'Deliverable', 'c_ExpenseCategory',
            'Parent',
            'State',
            'Owner',
            'PlanEstimate',
            'Project'
        ]
    }
})
