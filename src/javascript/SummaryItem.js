/* global Ext _ SummaryItem */

/**
 * NOTE: All individual fields needed by the summary and detail grids are placed
 * as top level fields to allow easy column sorting. The alternative of only setting
 * objects here and using template columns or custom renderers would then require
 * writing custom sorting functions for each column.
 */
Ext.define("SummaryItem", {
    extend: 'Ext.data.Model',
    fields: [{
        name: 'Project',
        type: 'auto'
    }, {
        name: 'Project_Name',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable_FormattedId',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable_Name',
        type: 'string'
    }, {
        name: 'PortfolioItem/Deliverable_State',
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
        name: 'PortfolioItem/Initiative_FormattedId',
        type: 'string'
    }, {
        name: 'PortfolioItem/Initiative_Name',
        type: 'string'
    }, {
        name: 'Children',
        type: 'auto'
    }],

    constructor: function(group) {
        this.callParent(arguments);

        var firstItem = group.children[0];
        var project = firstItem.get('Project');
        var deliverable = firstItem.get('Deliverable');

        this.set('Children', group.children);

        if (project) {
            this.set('Project', project);
            this.set('Project_Name', project.Name)
        }

        if (deliverable) {
            this.set('PortfolioItem/Deliverable_FormattedId', deliverable.FormattedID);
            this.set('PortfolioItem/Deliverable_Name', deliverable.Name);
            if (deliverable.State) {
                this.set('PortfolioItem/Deliverable_State', deliverable.State.Name);
            }

            var portfolioItem_Project = deliverable.Parent;
            if (portfolioItem_Project) {
                this.set('PortfolioItem/Project_FormattedId', portfolioItem_Project.FormattedID);
                this.set('PortfolioItem/Project_Name', portfolioItem_Project.Name);

                // Queue loading the PortfolioItem/Project so we can get the parent Initiative
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
                                this.set('PortfolioItem/Initiative_FormattedId', initiative.FormattedID);
                                this.set('PortfolioItem/Initiative_Name', initiative.Name);
                                // Update the children with this new data
                                this.annotateChildren()
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
        this.annotateChildren();
    },

    // Add the summary item values to each child as a field prefixed with 'SummaryItem_'.
    // This allows easy use of the children values in grids without needing custom sort
    // and render functions.
    annotateChildren: function() {
        var summaryItemFields = SummaryItem.getFields();
        _.forEach(this.get('Children'), function(child) {
            _.forEach(summaryItemFields, function(field) {
                child.set('SummaryItem_' + field.name, this.get(field.name));
            }, this);
            child.set('SummaryItem', this);
            var parent = child.get('Parent');
            if (parent) {
                child.set('Parent_FormattedId', parent.FormattedID);
            }
            var owner = child.get('Owner');
            if (owner) {
                child.set('Owner_Name', owner._refObjectName);
            }
        }, this);
    }
});
