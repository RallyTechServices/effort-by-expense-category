/* global Ext Rally _ */
Ext.define('Renderers', {
    statics: {
        /**
         * Given a record, returns the html for a link to the details of the record.
         * Used by column renderers.
         *
         * @param value (required) The column value
         *
         * @param options.record {Rally.data.wsapi.Model|Object} (required) The column record
         *
         * @param meta (required) The column meta data
         * 
         * @param path (optional) Do record.get(path) to fetch the object used for the link
         * 
         * @param options.showError {Boolean}
         * set to false to include the has-error class that indicates an eror value (default true)
         */
        link: function(value, meta, record, path, showError) {
            var result = value;
            var item = record;
            if (path && record) {
                item = record.get(path);
            }

            if (value) {
                result = Rally.nav.DetailLink.getLink({
                    record: item,
                    text: value,
                    showHover: true,
                    showTooltip: true
                });
            }
            else if (showError != false) {
                meta.tdCls = 'has-error'
            }
            return result;
        },

        piDeliverableIsClosed: function(value, meta, record) {
            // Show an icon if deliverable is closed and mark the cell so a CSS rule can highlight the entire row.
            // Otherwise, show blank
            var result = '';
            if (value == true) {
                result = '<span class="icon-ok icon-2x"><span>';
                meta.tdCls = 'has-error';
            }
            return result;
        }
    }
});
