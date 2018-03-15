/* global Ext _ SummaryItem Deft */

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
        name: 'PortfolioItem/Deliverable',
        type: 'auto'
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
        name: 'PortfolioItem/Project',
        type: 'auto'
    }, {
        name: 'PortfolioItem/Project_FormattedId',
        type: 'string'
    }, {
        name: 'PortfolioItem/Project_Name',
        type: 'string'
    }, {
        name: 'PortfolioItem/Initiative',
        type: 'auto'
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

        this.set('Children', group.children);

        if (project) {
            this.set('Project', project);
            this.set('Project_Name', project.Name)
        }

        this.loadParentPis(firstItem);

        this.set('ExpenseCategory', firstItem.get('c_ExpenseCategory'));
        var groupPlanEstimate = _.reduce(group.children, function(accumulator, story) {
            return accumulator += story.get('PlanEstimate');
        }, 0);
        this.set('PlanEstimate', groupPlanEstimate);
        this.annotateChildren();
    },

    loadParentPis: function(firstItem) {
        var deliverable = firstItem.get('Deliverable');

        if (deliverable) {
            this.set('PortfolioItem/Deliverable', deliverable);
            this.set('PortfolioItem/Deliverable_FormattedId', deliverable.FormattedID);
            this.set('PortfolioItem/Deliverable_Name', deliverable.Name);
            if (deliverable.State) {
                this.set('PortfolioItem/Deliverable_State', deliverable.State.Name);
            }

            // If this is a child of another story, Deliverable.Parent won't be set
            // (even if that Deliverable has a parent PI). Fetch the full Deliverable
            // to get PortfolioItem/Project information
            this.loadFullPortfolioItem(deliverable)
                .then({
                    scope: this,
                    success: function(fullDeliverable) {
                        var portfolioItem_Project = fullDeliverable.get('Parent');
                        if (portfolioItem_Project) {
                            this.set('PortfolioItem/Project', portfolioItem_Project);
                            this.set('PortfolioItem/Project_FormattedId', portfolioItem_Project.FormattedID);
                            this.set('PortfolioItem/Project_Name', portfolioItem_Project.Name);
                            return this.loadFullPortfolioItem(portfolioItem_Project);
                        }
                        else {
                            // No parent PortfolioItem/Project
                            return Ext.create('Deft.Deferred').resolve();
                        }
                    }
                })
                .then({
                    scope: this,
                    success: function(fullPortfolioItemProject) {
                        var initiative = fullPortfolioItemProject.get('Parent');
                        if (initiative) {
                            this.set('PortfolioItem/Initiative', initiative);
                            this.set('PortfolioItem/Initiative_FormattedId', initiative.FormattedID);
                            this.set('PortfolioItem/Initiative_Name', initiative.Name);
                        }
                        else {
                            return Ext.create('Deft.Deferred').resolve();
                        }
                    }
                })
                .then({
                    scope: this,
                    success: function() {
                        // Update the children with the PI data
                        this.annotateChildren();
                    }
                })
        }
    },

    loadFullPortfolioItem: function(partialItem) {
        return Ext.create('Rally.data.wsapi.Store', {
                model: partialItem._type,
                fetch: ['ObjectID', 'FormattedID', 'Name', 'Parent'],
                filters: [{
                    property: 'ObjectID',
                    value: partialItem.ObjectID
                }],
                autoLoad: false,
                context: {
                    project: null
                }
            })
            .load()
            .then(function(records) {
                if (records.length) {
                    return records[0]
                }
                else {
                    return null;
                }
            })
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
                child.set('Parent_Name', parent.Name);
            }
            var owner = child.get('Owner');
            if (owner) {
                child.set('Owner_Name', owner._refObjectName);
            }
        }, this);
    }
});
