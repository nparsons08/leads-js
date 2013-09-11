var Leads = function(cookieName, formPrefix, debug) {

    /**
     * Sets cookie prefix if LEADS_COOKIE_NAME global is set. Defaults to __gfLeads.
     */
    this.cookieName = cookieName;
    this.prefix = formPrefix;
    this.debug = debug;

    this.searchEngines = ['google', 'bing', 'ask', 'yahoo'];

    this.info = JSON.parse(this.getCookie()); // we will store pretty much every piece of info in here
    this.output = {};

    this.inputNames = [ // the fields we will be looking for
        'external_url', 
        'internal_url', 
        'medium', 
        'source', 
        'campaign', 
        'term', 
        'content'
    ];

    for (var i = 0; i <= this.inputNames.length; i++) {
        this.output[this.inputNames[i]] = (this.info[this.inputNames[i]] || '');
    }

    if (!this.isSameHost()) {
        this.process();
    } else {
        this.output.internal_url = this.getInternalURL() || '';
        this.save();
    }
};

Leads.prototype.process = function() {
    this.output.external_url = this.getExternalURL() || '';
    this.output.internal_url = this.getInternalURL() || '';

    var medium = this.getMedium(),
        query  = window.location.search;

    this.output.medium = 'other';

    if (medium.type == 'seo') {
        this.output.medium = 'seo';
        this.output.term = this.getSEOData() || '';
        this.output.source = medium.source;
    }

    if (medium.type == 'ppc') {
        this.output.medium = 'ppc';
        this.output.term = this.getParameterByName('utm_term');
    }

    var extra = this.getExtraData();
    this.output.campaign = extra.campaign;
    this.output.content = extra.content;

    this.save();
};

Leads.prototype.getElement = function(selector) {
    return document.querySelectorAll(selector);
};

Leads.prototype.getExternalURL = function() {
    return !this.isSameHost() ? document.referrer : false;
};

Leads.prototype.getInternalURL = function() {
    return this.isSameHost() ? document.referrer : false;
};

Leads.prototype.log = function() {
    if (this.debug) {
        var args = [this.prefix + 'leads debug:'];
        for (var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        console.log(args.join(' '));
    }
};

Leads.prototype.writeCookie = function(value, expires) {
    var date = new Date();
    date.setDate(date.getDate() + expires); // set an expiration date

    var data = escape(value) + ((expires === null) ? '' : '; expires='+ date.toUTCString());
    document.cookie = this.cookieName + "=" + data; // write the cookie
};

Leads.prototype.getCookie = function() {
    var cookies = document.cookie;
    // Our regex matches the name of the cookie and then pulls out the content all the way until the semicolon
    var matches = cookies.match(new RegExp('('+ this.cookieName + ')\=([^\;]+)', 'i'));

    // no cookie found
    if (!matches || matches.length === 0) {
        return false;
    }

    matches.shift(); // remove the first item from the results array (which is the pattern)

    return unescape(matches[1]); // cookies are escaped, so fix that
};

Leads.prototype.parseURI = function(uri) {
    // Apparently, if you simply create an anchor element, the browser creates a parsed URI object based on it
    var a = document.createElement('a'); 
    a.href = uri;

    return a;
};

Leads.prototype.isSameHost = function() {

    return (window.location.host == this.parseURI(document.referrer).host);
};

Leads.prototype.getMedium = function() {

    var seo_matches = document.referrer.match(new RegExp('('+ this.searchEngines.join('|') + ')', 'i'));

    if (seo_matches) {
        return { type: 'seo', source: seo_matches[1].split('.')[0] };
    }

    if (this.getParameterByName('utm_medium') == 'cpc') {
        
        return { type: 'ppc', source: this.getParameterByName('utm_source') };
    }

    return false;

};

Leads.prototype.getSEOData = function() {


    var queryMatches = document.referrer.match(/q\=([^\&]+)/); // grab the "search query" -- usually in a "q" get variable


    if (info.source == 'yahoo') { // they just have to be difficult (uses 'p' instead of 'q' for search)
        queryMatches = document.referrer.match(/p\=([^\&]+)/); // grab the "search query" -- usually in a "q" get variable
    }

    if (queryMatches && queryMatches.length === 2) {
        return queryMatches[1].split('+').join(' '); // spaces are turned into pluses, so switch those out
    }
        
    return false;
};

Leads.prototype.getPPCData = function() {
    return this.getParameterByName('utm_term');
};

Leads.prototype.getExtraData = function() {
    // grab all of the other fields regardless of the medium definition (they may still be there)
    return {
        campaign: this.getParameterByName('utm_campaign'),
        content: this.getParameterByName('utm_content')
    };
};

Leads.prototype.getParameterByName = function(name, queryString) {

    // Thanks to Stackoverflow for the bulk of this code.  Looks like we are adjusting the potential arrays
    // inside of our query string
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");

    // Based on the property name grab the potential content immediately following it.
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec((queryString || window.location.search));// handle if they pass a URI directly or just use the current one

    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " ")); // decode what we have returned

};

Leads.prototype.save = function() {
    this.writeCookie(JSON.stringify(this.output), 30);
    this.info = JSON.parse(this.getCookie());
};

Leads.prototype.updateForm = function() {

    var $ = this.getElement;

    // checking to see if we have at least one form on the page
    if ($('form').length > 0) {

        var gravity = $('.gfield').length > 0; // Tell us if we should handle gravity forms

        for (var i = 0; i < this.inputNames.length; i++) {

            // now we are looking to find all of the fields that we defined way at the top
            var field = this.inputNames[i],
                elm = gravity ? $('.'+ this.prefix + field + ' input') : $('[name='+ this.prefix + field + ']');

            this.log(elm);

            if (elm.length > 0) { // we have a match

                // if the internal data isn't actually defined, just put a string... otherwise show our findings
                elm[0].value = (typeof this.output[field] !== 'undefined') ? this.output[field] : '';
            }

        }
    }
};

Leads.prototype.get = function(name) {
    return this.info[name];
};

(function() {

    var leads = new Leads('__gfLeads', 'gf_', true);
    if (!document.querySelectorAll) {
        
        if (console) {
            console.log('leads.js cannot run without browser support for querySelectorAll');
        }

        return false;
    }
    
    leads.updateForm();


})();
