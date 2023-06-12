# Docsy

> A syntax for Component based documents

## Syntax

### Text

By default any content is considered as text.

### Comments

You can use line comments `//` or block comments `/*` and `*/`.  
Comments also works inside elements !

### Inject

You can insject value with `{}`:

```docsy
Two plus two is {2 + 2} !
```

### Identifier

An identifier must start with a letter (`[A-Za-z]`) and can contain letters, numbers and `_`.

### Expression

An expression can be:

- A literal value
- An identifier
- A function call
- A dot member
- A bracket member

### Literal value

#### String

Strings works like in JavaScript:

- Single and double quotes do not support new lines.
- Backtick quote support new lines.

#### Numbers

Exponent are not supported

#### Boolean

`true` and `false`

#### Null & Undefined

`null` and `undefined` are supported

### Elements

#### Basic elemment

```
<|Tag>Content<Tag/>
```

#### Raw element

Raw Element content is always treated as text.

```
<#Tag>Content<Tag/>
```

#### Close tag shortcut

Both normal and raw closing tag can omit the tag name:

```
<|Tag>Content</>
<#Tag>Content</>
```

#### Self closing element

```
</Tag/>
```

#### Line element

Line element end at the end of the line (or end of file)

```
<Tag>Content
```

#### Fragments

```
<|>Content</>
<#>Raw Content</>
```

#### Tag name

Tag name must be a valid identifier or a member access like `foo.bar`.

#### Examples

```
// Normal: open / close
<|Tag>Some content<Tag/>

// Normal: open / close shortcut
<|Tag>Some content</>

// Raw: open / close
<#Tag>Some content<Tag/>

// Raw: open / close shortcut
<#Tag>Some content</>

// Normal: line
<Tag>Hello Test

// Self closig
</Tag/>

// FRAGMENTS

// Normal fragment
<|>Some content</>

// Raw fragment
<#>Some content</>
```

### Attributes

Any opening / self closing tag can have attributes.

Attributes are sparated by whitespace and are in the form `NAME=VALUE` or simply `NAME`.

Attribute name can be any valid identifier.

Attribute value can be any expression.
