---
status: accepted
---

# A Tree checkbox is a view of the selection, not a Checked state

A multiple Tree can show a checkbox on each row. A checked box means that the Node is a
Selected Node. There is one state, one `v-model`, and the row keeps `aria-selected`. The Tree
has no Checked Node and no `v-model:checked`.

```vue
<Tree v-model="selected" multiple checkboxes :items="items" aria-label="Files" />
```

This records why, because a reader who knows VS Code or Jira expects the other model, where
the highlighted row and the ticked rows are different things.

## Considered options

- **A separate Checked state.** A Node can be selected without being checked, and the reverse.
  This needs a second model, `aria-checked` on the treeitem, and a third term beside the
  Focused Node and the Selected Node.
- **A view of the selection.** Chosen. The checkbox is a larger hit area and a clearer picture
  of the same state.

The deciding fact is that the Tree already separates the Focused Node from the Selected Node.
In the two-state model, the "highlighted row" is where the user is. Here, the Focused Node
already fills that role, so a Checked state adds a third state for a job that is done.

APG also advises against `aria-selected` and `aria-checked` on the same treeitem, because
screen readers announce the pair inconsistently. A Checked state would make the Tree choose
one attribute per mode, and the announcement would change with a prop.

## What this rules out

- **Checkbox cascade.** A Parent Node does not select its children, and no Node shows an
  indeterminate state. This stays out of scope, as the Tree DESIGN.md says.
- **Checkboxes under `selectionBehavior: 'replace'`.** Under replace, a plain click clears the
  other Selected Nodes. A checkbox beside such a row shows a toggle that the click does not
  perform. The Tree shows checkboxes only with `multiple` and `toggle`, and warns in
  development otherwise.

## Cost of reversal

High. A Checked state changes the shape of the model: consumers bind a second `v-model`, and
every place that reads the Selected Nodes must decide which state it means. Adding it later
also changes the announcement of every row from "selected" to "checked".
