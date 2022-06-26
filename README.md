# RDF graph visualizer

Next generation (generalization of https://gitlab.hs-anhalt.de/both_a/qanaryannotationvisualizationui) of an RDF graph visualizer JavaScript component

## Configuration

The entire configuration is stored long-term in the browser's `localStorage`, except for:

* the password for the SPARQL endpoint
* the node capacity (defaults to `10`)
* The options to show the node and link text (active by default)

which are stored in the browser's `sessionStorage` and therefore deleted after each browser session, i. e. they are removed when you close the last browser tab in which you have this application open.

### SPARQL Endpoint

Example: `https://example.com/{DATABASE}`

Is this mandatory? Yes.

Explanation: `{DATABASE}` needs to be replaced with the name of the database from which you wish to query the data.

### Username and Password

Example:

* Username: `admin`
* Password: `admin`

Is this mandatory? Yes.

Explanation: These are the credentials needed to authenticate against the SPARQL endpoint. The default login data for SPARQL endpoints are `admin` / `admin`.

### Graph URI

Example: `urn:graph:example`

Is this mandatory? Yes.

Explanation: The URN of the graph within the specified database which you wish to visualize.

### Preferred Source Node

Example: `https://example.com/Example`

Is this mandatory? No.

Explanation: This is a node (subject or object of a triple) which is used as the source node for the graph. When collapsing nodes, this will be the root node.

### Use default prefixes

Is this mandatory? No.

Explanation: The default prefixes are fetched upon startup of the program from `http://prefix.cc/popular/all`, which contains a list of common interpretations for prefixes. If enabled, this list will become available to the blacklist, whitelist and used in rendering the graph.

### Show node text

Is this mandatory? No.

Explanation: If enabled, the text above nodes, showing the subject and object values, will be displayed.

### Showing link text

Is this mandatory? No.

Explanation: If enabled, the text boxes on top of links, showing the predicate values, are displayed.

### RDF Prefixes

Example:

* `@prefix ex: <http://example.com/Example#>.`
* `PREFIX ex: <http://example.com/Example#>`

Is this mandatory? No.

Explanation: This is the list of prefixes which will be used to shorten text when rendering the graph. It also becomes accessible to the whitelist and blacklist. Both 1.0 and 1.1 syntax can be used. Blank lines and whitespaces are allowed.
> **Prefixes which appear earlier in the list of prefixes take precedence in case of conflicts.**

### Blacklist and Whitelist

Example:

* `http://example\\.com/Example#Entity`
* `ex:Entity`
* `Example String`
* `12345`
* `+sExampleValue`
* `+o+s\\+pExampleValue`
* `http://example\\.com/image\\.(png|jpg|gif)`

Is this mandatory? No.

Explanation: This can be used to filter out triples you don't want to look at.

`Blacklist:` If even a single element of a triple matches, the entire triple will be filtered out from the rendered graph.

`Whitelist:` If even a single element of a triple matches, the entire triple will remain in the rendered graph.
> **The blacklist takes precedence over the whitelist.**

Each line is interpreted as an individual regular expression in a list. To only apply a filter to subjects, predicates or objects, you can add +s, +p and +o as prefixes respectively.

For example: `+s+p+oExample` is equivalent to `Example`, `+sExample` only applies to subjects which contain the string "Example" and `\+sExample` applies to any triple which contains the string "\s+Example" in the subject, predicate or object.

To escape special characters, you need to use two backslashes. For example: `example\\.com`

To transform a list item to a regular expression, JavaScript's `RegExp()` is used internally. You can use it in a browser console to verify your regular expressions.

### Node Capacity

Example:

* `10`
* `200`
* `8021424300012`

Is this mandatory? Yes.

Explanation: This is used to set how many nodes will be visible upon the first rendering of the graph. More nodes can be displayed by expanding nodes. The full graph will be iteratively collapsed from the most distant nodes with respect to the source node down to the source node. The minimal valid value is 1 and it can be arbitrarily high (within the constraints of JavaScript's `number` data type).
