const css = require('@webref/css');
const { definitionSyntax } = require('css-tree');

css.parseAll().then(async (all) => {
  const descriptors = new Map();
  const properties = new Map();
  const valuespaces = new Map();

  // Custom valuespaces (missing or not picked up by Reffy)
  function patch(name, value) {
    valuespaces.set(`<${name}>`, {value});
  }
  // https://drafts.csswg.org/css-fonts-3/#absolute-size-value
  patch('absolute-size', '[ xx-small | x-small | small | medium | large | x-large | xx-large ]');
  // https://drafts.csswg.org/css-values-3/#angles
  patch('angle', 'TODO');
  // https://drafts.csswg.org/css-shapes-1/#typedef-basic-shape
  patch('basic-shape', '<inset()> | <circle()> | <ellipse()> | <polygon()> | <path()>');
  // https://drafts.csswg.org/css-counter-styles-3/#typedef-counter-style-name
  patch('counter-style-name', 'TODO');
  // https://drafts.csswg.org/css-values-3/#custom-idents
  patch('custom-ident', 'TODO');
  // https://drafts.csswg.org/css-speech-1/#typedef-voice-volume-decibel
  patch('decibel', '<dimension> "dB"');

  // https://drafts.csswg.org/css-fonts-3/#relative-size-value
  patch('relative-size', '[ larger | smaller ]');

  // TODO
  patch('dimension', 'TODO');
  patch('dimension-unit', 'TODO');
  patch('flex', 'TODO');
  patch('frequency', 'TODO');
  patch('hex-color', 'TODO');
  patch('hsla()', 'TODO');
  patch('ident', 'TODO');
  patch('integer', 'TODO');
  patch('n-dimension', 'TODO');
  patch('named-color', 'TODO');
  patch('number', 'TODO');
  patch('outline-line-style', 'TODO');
  patch('repeating-linear-gradient()', 'TODO');
  patch('repeating-radial-gradient()', 'TODO');
  patch('resolution', 'TODO');
  patch('rgba()', 'TODO');
  patch('string', 'TODO');
  patch('system-color', 'TODO');
  patch('time', 'TODO');
  patch('uri', 'TODO');

  // First collect everything.
  for (const [shortname, data] of Object.entries(all)) {
    for (const [name, descriptor] of Object.entries(data.descriptors)) {
      // encode the at-rule and descriptor in an ID that should be unique
      const id = `${descriptor.for}.${name}`;
      if (descriptors.has(id)) {
        console.log(`Duplicate definition of descriptor ${name} for ${descriptor.for}`);
      }
      descriptors.set(id, descriptor);
    }

    for (const [name, property] of Object.entries(data.properties)) {
      if (properties.has(name)) {
        console.log(`Duplicate definition of property ${name}`);
      }
      properties.set(name, property);
    }

    for (const [name, valuespace] of Object.entries(data.valuespaces)) {
      if (valuespaces.has(name)) {
        console.log(`Duplicate definition of valuespace ${name}`);
      }
      valuespaces.set(name, valuespace);
    }
  }

  function parseAndValidate(value, context) {
    let ast;
    try {
      ast = definitionSyntax.parse(value);
    } catch (e) {
      console.log(`Unable to parse ${value} [${context}]`, e.message);
      return;
    }

    const keywords = new Set();
    let skipNode = null;
    definitionSyntax.walk(ast, {
      enter(node) {
        if (skipNode) {
          return;
        }
        switch (node.type) {
          case 'AtKeyword':
            // TODO
            break;
          case 'Group':
            // Don't traverse into groups that require more than one
            // component, since that isn't a single keyword.
            if (node.combinator === ' ' || node.combinator === '&&') {
              skipNode = node;
            }
            break;
          case 'Keyword':
            keywords.add(node.name);
            break;
          case 'Multiplier':
            // TODO: check if more than 1 required
            break;
          case 'Property':
            if (!properties.has(node.name)) {
              console.log(`Missing definition of property ${node.name} [${context}]`);
            }
            break;
          case 'String':
            // TODO
            break;
          case 'Type':
            if (!valuespaces.has(`<${node.name}>`)) {
              console.log(`Missing definition of valuespace ${node.name} [${context}]`);
            }
            break;
          default:
            throw new Error(`Unhandled AST node type: ${node.type} [${context}]`);
        }
      },
      exit(node) {
        if (node === skipNode) {
          skipNode = null;
        }
      }
    });
  }

  // Descriptors
  for (const descriptor of descriptors.values()) {
    if (!descriptor.value) {
      throw new Error(`descriptor with no value syntax`);
    }
    parseAndValidate(descriptor.value, `${descriptor.for}.${descriptor.name} descriptor`);
  }

  // Properties
  for (const [name, property] of properties.entries()) {
    if (property.value) {
      parseAndValidate(property.value, `${name} property`);
    }
    if (property.newValues) {
      parseAndValidate(property.newValues, `${name} extended property`);
    }
  }

  // Valuespaces
  for (const [name, valuespace] of valuespaces.entries()) {
    if (valuespace.value) {
      parseAndValidate(valuespace.value, `${name} valuespace`)
    }
  }
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
