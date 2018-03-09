/* global Ext _ */
Ext.define("SummaryItem", {
    extend: 'Ext.data.Model',
    fields: [{
        name: 'Project',
        type: 'auto',
    }, {
        name: 'ProjectName',
        type: 'string'
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
        name: 'PlanEstimate',
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
            this.set('Project', project);
            this.set('ProjectName', project.Name)
        }

        if (deliverable) {
            this.set('DeliverableFormattedId', deliverable.FormattedID);
            this.set('DeliverableName', deliverable.Name);
            if (deliverable.State) {
                this.set('DeliverableState', deliverable.State.Name);
            }

            var portfolioItem_Project = deliverable.Parent;
            if (portfolioItem_Project) {
                this.set('PortfolioItem/Project_FormattedId', portfolioItem_Project.FormattedID);
                this.set('PortfolioItem/Project_Name', portfolioItem_Project.Name);

                // Queue a load of the PortfolioItem/Project so we can get the parent Initiative
                var projectStore = Ext.create('Rally.data.wsapi.Store', {
                    model: portfolioItem_Project._type,
                    fetch: ['FormattedID', 'Name', 'Parent'],
                    filters: [{
                        property: 'ObjectID',
                        value: portfolioItem_Project.ObjectID
                    }],
                    autoLoad: false,
                    context: {
                        project: null
                    }
                });
                projectStore.load().then({
                    scope: this,
                    success: function(records) {
                        if (records.length) {
                            var initiative = records[0].get('Parent');
                            if (initiative) {
                                this.set('InitiativeFormattedId', initiative.FormattedID);
                                this.set('InitiativeName', initiative.Name);
                            }
                        }
                    }
                });
            }
        }

        this.set('ExpenseCategory', firstItem.get('c_ExpenseCategory'));
        var groupPlanEstimate = _.reduce(group.children, function(accumulator, story) {
            return accumulator += story.get('PlanEstimate');
        }, 0);
        this.set('PlanEstimate', groupPlanEstimate);
    },
});
