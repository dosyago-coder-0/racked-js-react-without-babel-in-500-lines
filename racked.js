"use strict";
{
  const VOID_ELEMENTS = new Set([
    "area",
    "base",
    "br",
    "col",
    "command",
    "embed",
    "hr",
    "img",
    "input",
    "keygen",
    "link",
    "menuitem",
    "meta",
    "param",
    "source",
    "track",
    "wbr"
  ]);
  const MAYBE_CAN_FOCUS = [
    '[tabindex]:not([tabindex^="-"])',
    'a[href]',
    'area[href]',
    'button',
    'details',
    'input',
    'iframe',
    'select',
    'textarea',
    '[contenteditable]',
  ].join(', ');
  
  const DATE_MATCHER = /^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\dZ$/;
  const LAST_ATTR_NAME = /\s+([\w-]+)\s*=\s*"?\s*$/;

  class Component {
    constructor(props = {}) {
      this.props = Object.assign({},props);
      this.state = {};
      Object.assign(this.state,this.props);
    }
    setState(newState) {
      const focusElement = document.activeElement;
      const recoverFocus = focusRecoverable(focusElement);
      let focusSelector;
      if ( recoverFocus ) {
        focusSelector = getSelector(focusElement);
      }
      switch( typeof newState ) {
        case "function":
          this.setState(newState(Object.assign({},this.state),this.props));
          break;
        case "object":
          Object.assign(this.state,newState);
          break;
        default:
          this.state = newState;
          break;
      }
      self.Racked.render(this.render(),this.root);
      setTimeout( () => {
        if ( !! focusSelector ) {
          if ( ! document.activeElement.matches(focusSelector) ) {
            (this.root || document).querySelector(focusSelector).focus();
          }
        }
      }, 0 );
    }
    componentDidMount() {}
  }

  const Racked = { Component };

  Object.assign(self, {Racked});
  Object.assign(self, {df,fc});
  Object.assign(self,{VOID_ELEMENTS,R});
  Object.assign(self,{save,load});
  Object.assign(self,{clone,descendent});

  let debug = false;

  Object.assign(Racked,{render});

  function FancyBorder(props) {
    return R`
      <div className=${'FancyBorder FancyBorder-' + props.color}>
        ${props.children}
      </div>
    `;
  }

  function Dialog(props) {
    return R`
      <FancyBorder color="blue">
        <h1 className="Dialog-title">
          ${props.title}
        </h1>
        <p className="Dialog-message">
          ${props.message}
        </p>
        ${props.children}
      </FancyBorder>
    `;
  }

  class SignUpDialog extends Racked.Component {
    constructor(props) {
      super(props);
      this.handleChange = this.handleChange.bind(this);
      this.handleSignUp = this.handleSignUp.bind(this);
      this.state = {login: ''};
    }

    render() {
      return R`
        <Dialog title="Mars Exploration Program"
                message="How should we refer to you?">
          <input value=${this.state.login}
                 onChange=${this.handleChange} />
          <button onClick=${this.handleSignUp}>
            Sign Me Up!
          </button>
        </Dialog>
      `;
    }

    handleChange(e) {
      this.setState({login: e.target.value});
    }

    handleSignUp() {
      alert(`Welcome aboard, ${this.state.login}!`);
    }
  }

  Racked.render(
    R`<SignUpDialog />`,
    document.getElementById('root')
  );

  function render(markup, where, memory = {roots:[], handlers:{}}) {
    const {roots:roots = [], handlers:mhandlers={}} = memory;
    Object.assign(memory,{roots,handlers:mhandlers});
    let str, handlers;
    ({str:str=markup,handlers:handlers={}} = markup);
    Object.assign(memory.handlers,handlers);
    const rack = fc(str);
    let isClass = false;
    let component;
    if ( ! rack ) {
      return {str,handlers:memory.handlers};
    }

    const parser = document.createTreeWalker(rack,NodeFilter.SHOW_ALL);
    const stack = [];
    let html = '';

    do {
      const node = parser.currentNode;
      switch( node.nodeType ) {
        case Node.ELEMENT_NODE: {
          const name = node.tagName.toLowerCase();
          const CapitalizedNameIndex = str.toLowerCase().indexOf(name);
          let CapitalizedName = name;
          if ( CapitalizedNameIndex >= 0 ) {
            CapitalizedName = str.substr(CapitalizedNameIndex,name.length);
          }
          // see if it's a ract component (if there's a function / class called <CapitalizedName>))
          try {
            const props = Array.from(node.attributes)
              .reduce((all,{name,value}) => {
                if ( name.startsWith('data-hid') && value.startsWith('hid:') ) {
                  if ( !! memory.handlers[value] ) {
                    memory.handlers[value].forEach( ({eventName,handler}) => {
                      const func = handler;
                      let name = eventName;
                      name = name.startsWith('on') ? name : ('on' + name
                        .replace(/^\w/, c => c.toUpperCase()));
                      all[name] = func;
                   });
                  }
                } else if ( name == "classname" ) {
                  node.setAttribute("class", value);
                  node.removeAttribute("classname");
                } else {
                  try {
                    all[name] = load(value);
                  } catch(e) {
                    debug ? console.warn(e,name,value) : void 0;
                    all[name] = value;
                  }
                }
                return all;
              },{});
            isClass = eval(`descendent(${CapitalizedName},Racked.Component)`);
            let componentRender, componentHtml;
            Object.assign(props,memory.handlers.props);
            let hasClosingTag = str.match(new RegExp(`</${CapitalizedName}`));
            let cid;
            if ( hasClosingTag ) {
              cid = "cid:"+Math.random();
              props.children = cid;
              stack.push({localName:CapitalizedName,cid});
            }
            if ( isClass ) {
              component = eval(`new ${CapitalizedName}(props)`);
              componentRender = component.render(); 
              ({str:componentHtml=componentRender} = componentRender);
            } else {
              componentRender = eval(`${CapitalizedName}(props)`);
              ({str:componentHtml=componentRender} = componentRender);
            }
            Object.assign(memory.handlers, componentRender.handlers);
            const renderedAgainComponentHtml = render({
              str:componentHtml,
              handlers:componentRender.handlers
            },null,memory);
            if ( componentHtml !== renderedAgainComponentHtml.str ) {
              componentHtml = renderedAgainComponentHtml.str; 
            }
            if ( !! component ) {
              const currentComponent = component;
              const cfrag = df(componentHtml);
              try {
                const rid = cfrag.querySelector('[data-ractid]').dataset.ractid;
                memory.roots.push(() => {
                  const root = document.querySelector(`[data-ractid="${rid}"]`);
                  currentComponent.root = root;
                  currentComponent.componentDidMount();
                });
              } catch(e){
                debug ? console.warn(e) : void 0;
                currentComponent.root = where;
                currentComponent.noRactId = true;
              }
            }
            if( hasClosingTag ) {
              memory[cid] = componentHtml;
            } else {
              html += componentHtml;
            }
            break;
          } catch(e) {
            debug ? console.warn(e) : void 0;
            // not a ract component so we need to close it if it's non-void
            if ( ! VOID_ELEMENTS.has(node.localName) ) {
              stack.push(node);
            }
            // and report it
            const id = 'id:' + Math.random();
            html += `<${name}${
              node.childElementCount ? ` data-ractid="${id}"` : ''}${
              node.attributes.length ? ' ' + Array.from(node.attributes)
                .map( attr => `${attr.name}="${attr.value}"` )
                .join(' ') : ''}>`;
            // controlled form "select" new code
              if ( name == 'select' && !! node.attributes.value ) {
                const selected = node.attributes.value.value;
                Array.from(node.querySelectorAll('*')).forEach( el => {
                  if ( el.localName == 'option' && el.value == selected ) {
                    el.setAttribute("selected","");
                  }
                });
            }
            break;
          }
        }
        default: {
          if ( !! node.nodeValue ) {
            const renderedAgainComponentHtml = render({str:node.nodeValue,handlers},null,memory);
            if ( renderedAgainComponentHtml.str !== node.nodeValue ) {
              html += renderedAgainComponentHtml.str;
            } else {
              html += node.nodeValue || '';
            }
          }
          break;
        }
      }
      if ( ! node.nextSibling && ! node.childNodes.length ) {
        const parent = stack.pop(); 
        if ( !! parent && parent.cid ) {
          let rawHtml = memory[parent.cid];
          rawHtml = rawHtml.replace(parent.cid,html);
          html = rawHtml;
        }
        else if ( !! parent && ! VOID_ELEMENTS.has(parent.localName) ) {
          html += `</${parent.localName}>`;
        }
      }
    } while(parser.nextNode());

    while(stack.length) {
      let snode = stack.pop();
      if ( !! snode ) {
        if( ! VOID_ELEMENTS.has(parent.localName)) {
          html += `</${parent.localName}>`;
        }
        snode = stack.pop(); 
      }
    }

    if ( isClass ) {
      component.componentDidMount();
    }
    let output;
    if ( ! where ) {
      output = {str:html,handlers};
    } else {
      where.innerHTML = html;
      memory.roots.forEach(f => f());
      Object.keys(memory.handlers).forEach( hid => {
        const node = document.querySelector(`[data-hid="${hid.replace(':', ":")}"]`);
        if ( !! node ) {
          memory.handlers[hid].forEach( ({eventName, handler}) => {
            node.addEventListener(eventName, handler);
            if ( isClass ) {
              component.props[eventName] = handler;
            }
          });
        }
      });
      output = {str:html,handlers};
    }
    return output;
  }

  function df( t ) {
    return (new DOMParser).parseFromString(`<template>${t}</template>`,"text/html").head.firstElementChild.content;
  }
  
  function fc( t ) {
    return (new DOMParser).parseFromString(`<template>${t}</template>`,"text/html").head.firstElementChild.content.firstElementChild;
  }

  function R(parts, ...vals) {
    parts = Array.from(parts);
    const handlers = { };
    const stack = [];
    vals = vals.map( v => {
      if ( Array.isArray(v) && v.every(item => !!item.handlers && !!item.str) ) {
        return v.map(
            r => (Object.assign(handlers,r.handlers), r.str)
          )
          .join('\n');
      } else if ( typeof v === "object" && !(v.handlers && v.str) ) {
        return save(v);
      } else return v;
    });
    let str = '';
    let isAttr = false;
    let hasQuote = false;
    let killFirstQuote = false;
    while(parts.length > 1) {
      let part = parts.shift();
      const attrNameMatches = part.match(LAST_ATTR_NAME);
      if ( attrNameMatches && attrNameMatches.length > 1) {
        isAttr = true;
        if ( attrNameMatches[0].includes('"') ) {
          hasQuote = true;
        } else {
          hasQuote = false; 
        }
      } else {
        isAttr = false;
      }
      if ( isAttr && !hasQuote ) {
        part += '"';
      }
      if ( killFirstQuote ) {
        part = part.replace(/^\s*"(.)/,'$1'); 
        killFirstQuote = false;
      }
      const val = vals.shift();
      if ( typeof val == "function" ) {
        const attrNameMatches = part.match(LAST_ATTR_NAME);
        let realAttrName;
        let attrName;
        if ( attrNameMatches && attrNameMatches.length > 1) {
          attrName = realAttrName = attrNameMatches[1]; 
          attrName = attrName.replace(/^on/,'').toLowerCase();
        }
        const newPart = part.replace(attrNameMatches[0], '');
        const hid = 'hid:' + Math.random();
        handlers[hid] = [{
          eventName: attrName, handler: val
        },{
          eventName: realAttrName, handler: val
        }];
        str += newPart + (!!attrName ? ` data-hid="${hid}"` : '');
        killFirstQuote = attrNameMatches[0].includes('"');
      } else if ( !! val && val.handlers && val.str ) {
        Object.assign(handlers,val.handlers);
        str += part;
        str += val.str;
      } else {
        str += part;
        str += val;
      }
      if ( isAttr ) {
        const noQuoteEnding = str.match(/=\s*"[^"]*$/);
        //const quoteEnding = str.match(/=\s*"[^"]*"\s*$/); 
        if ( noQuoteEnding ) {
          str += '"';
        }
      }
    }
    str += parts.shift();
    return {str,handlers};
  }

  function save(o) {
    const s = JSON.stringify(o).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    return s;
  }

  function load(s) {
    const o = JSON.parse(s.replace(/&quot;/g,'"').replace(/&amp;/g,'&'), loadDate);
    return o;
  }

  function loadDate(k,v) {
    if (typeof v === "string" && DATE_MATCHER.test(v)) {
      return new Date(v);
    }
    return v;
  }

  function descendent(cls,superClass) {
    let {prototype} = cls;
    let checks = 0;
    while( !! prototype && checks < 100 ) {
      checks += 1;
      if ( prototype === superClass.prototype ) {
        return true;
      }
      prototype = Object.getPrototypeOf(prototype);
    }
    return false;
  }

  function clone(o) {
    return JSON.parse(JSON.stringify(o),loadDate);
  }

  function focusRecoverable(el) {
    return el.matches(MAYBE_CAN_FOCUS);
  }

  function getSelector(el) {
    const path = [];
    do {
      const level = `${el.localName}${
        el.id ? `#${el.id}` : ''
      }${ 
        el.name ? `[name="${el.name}"]` : ''
      }`;
      path.unshift( level );
      el = el.parentNode;
      if ( el == root ) break;
      if ( el == document ) break;
      if ( el.shadowHost ) {
        // since /deep/ and ::shadow were deprecated there's no way
        // to make a CSS selector from document work
        break;
      }
    } while(el);
    return path.join(' ');
  }
}
