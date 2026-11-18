# GOV.UK — iconography

Domain 7 of the fixed 18. Status: **EVIDENCED, and the evidence is mostly a refusal.** GOV.UK's
strongest icon statement is "Avoid using icons in most cases", with the reason and the exception. That
is the shape our iconography ruling needs: not a library, but a rule about what an icon may promise.

Page reached: `https://design-system.service.gov.uk/styles/images/` (68,039 B).

| id | claim | kind | locator | quote | enforcement in source |
|---|---|---|---|---|---|
| G7-icon-01 | Images are last-resort furniture: the service should work without them. | rule | `https://design-system.service.gov.uk/styles/images/#images` | "Services usually work best without relying on images. Focus on writing clear, simple content for your service first." | none |
| G7-icon-02 | An image may decorate but may not carry: the words must contain everything needed to complete the task. | rule | `https://design-system.service.gov.uk/styles/images/#images` | "However, images should only be visual aids - written content must contain all the information the user needs to complete the service." | none |
| G7-icon-03 | Alt text is a **decision with a cost**, not a mechanical attribute. | rule | `https://design-system.service.gov.uk/styles/images/#images` | "If you choose to add an image to your service, you'll need to carefully decide if the image needs to be described with alternative text (alt text)." | none |
| G7-icon-04 | **Avoid using icons in most cases**, and the reason is ambiguity, not aesthetics. | rule | `https://design-system.service.gov.uk/styles/images/#icons` | "Avoid using icons in most cases. People can understand a single icon to mean different things, so they can be confusing." | none |
| G7-icon-05 | The exception is named and it is a *reuse* condition: familiarity plus return frequency. | pattern | `https://design-system.service.gov.uk/styles/images/#icons` | "Icons can be more useful in case working systems, where users are familiar with the interface and return to it frequently." | none |
| G7-icon-06 | Even in the exception, the label stays: an icon is an accent on a word, never a replacement for it. | rule | `https://design-system.service.gov.uk/styles/images/#icons` | "In most cases it's still helpful to include a visible text label alongside any icons." | none |
| G7-icon-07 | One icon, one meaning — stated with the canonical failure mode. | rule | `https://design-system.service.gov.uk/styles/images/#icons` | "Do not use a single icon to represent more than one thing." | none |
| G7-icon-08 | Photography has a refusal and a use, split by whether the subject is literal. | rule | `https://design-system.service.gov.uk/styles/images/#photography` | "Do not use photography to represent abstract concepts, such as to convey an impression or emotion to the user." | none |
| G7-icon-09 | Generic stock photography is refused outright — a cost-free line in a register we already use. | rule | `https://design-system.service.gov.uk/styles/images/#photography` | "Avoid using generic stock photography in your service." | none |
| G7-icon-10 | Illustration has a shape and colour consistency rule (see `radius-shape.md`) and a people rule that is about representation, not style. | rule | `https://design-system.service.gov.uk/styles/images/#illustration` | "Avoid depicting people in illustrations." | none |
| G7-icon-11 | Depicting one kind of person is an exclusion defect, named as a stereotype risk. | rule | `https://design-system.service.gov.uk/styles/images/#illustration` | "For example, only depicting people of a particular age, gender or ethnicity can exclude people and reinforce negative stereotypes." | none |
| G7-icon-12 | **Absence:** no icon size scale, no stroke width, no grid for icons, no icon library — the whole geometry of an icon is unspecified. | absence | `https://design-system.service.gov.uk/styles/images/#icons` | "Do not use a single icon to represent more than one thing." | none |

**Read against our system:** rows 04/05/06/07 are the four sentences that matter, and they are the
*reasoning* our iconography ruling should carry: an icon may not be the only carrier of a meaning, a
label may not be dropped, and one glyph may not mean two things. None of this imports a library, a
glyph set, or a size — which is exactly what the topic's "no component-library recommendations"
constraint asks for, and what our own register already insists on.

Row 12 is where the systems part company: their corpus specifies **nothing geometric about an icon**,
and whether that leaves us with a gap depends on our own state, which is measured in `GAP-ANALYSIS.md`
§0 rather than asserted here. No detector may be proposed from this file for anything geometric — there
is no number in this system to propose one against — and the only gap worth ranking is semantic:
"does every icon in `src/` have a text alternative or an aria-hidden partner", which is checkable in
our own trees without borrowing a single figure from here.
