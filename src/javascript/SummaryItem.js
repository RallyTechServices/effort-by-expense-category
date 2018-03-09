/* global Ext */
Ext.define("SummaryItem", {
    extend: 'Ext.data.Model',
    fields: [{
        name: 'TeamName',
        type: 'string',
    }, {
        name: 'DeliverableFormattedId',
        type: 'string'
    }, {
        name: 'DeliverableName',
        type: 'string'
    }, {
        name: 'DeliverableState',
        type: 'string'
    }, {
        name: 'ExpenseCategory',
        type: 'string'
    }, {
        name: 'PercentEffort',
        type: 'float'
    }, {
        name: 'PortfolioItem/Project_FormattedId',
        type: 'string'
    }, {
        name: 'PortfolioItem/Project_Name',
        type: 'string'
    }, {
        name: 'InitiativeFormattedId',
        type: 'string'
    }, {
        name: 'InitiativeName',
        type: 'string'
    }],
    constructor: function(group) {
        this.callParent(arguments);

        var firstItem = group.children[0];
        var project = firstItem.get('Project');
        var deliverable = firstItem.get('Deliverable');

        if (project) {
            this.set('TeamName', project.Name);
        }

        if (deliverable) {
            this.set('DeliverableFormattedId', deliverable.FormattedID);
            this.set('DeliverableName', deliverable.Name);
            this.set('DeliverableState', deliverable.State);

            var portfolioItem_Project = deliverable.Parent;
            if (portfolioItem_Project) {
                this.set('PortfolioItem/Project_FormattedId', portfolioItem_Project.FormattedID);
                this.set('PortfolioItem/Project_Name', portfolioItem_Project.Name);
                var initiative = portfolioItem_Project.Parent;
                if (initiative) {
                    this.set('InitiativeFormattedId', initiative.FormattedID);
                    this.set('InitiativeName', initiative.Name);
                }
            }
        }

        this.set('ExpenseCategory', firstItem.get('c_ExpenseCategory'));
        this.set('PercentEffort', 'TODO');

    }
});
