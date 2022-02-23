import j from"type-flag";import N from"tty";import B,{breakpoints as P}from"terminal-columns";const S=t=>t.replace(/[-_ ](\w)/g,(e,r)=>r.toUpperCase()),_=t=>t.replace(/\B([A-Z])/g,"-$1").toLowerCase(),q={"> 80":[{width:"content-width",paddingLeft:2,paddingRight:8},{width:"auto"}],"> 40":[{width:"auto",paddingLeft:2,paddingRight:8,preprocess:t=>t.trim()},{width:"100%",paddingLeft:2,paddingBottom:1}],"> 0":{stdoutColumns:1e3,columns:[{width:"content-width",paddingLeft:2,paddingRight:8},{width:"content-width"}]}};function D(t){let e=!1;const n=Object.keys(t).sort((a,i)=>a.localeCompare(i)).map(a=>{const i=t[a],s="alias"in i;return s&&(e=!0),{name:a,flag:i,flagFormatted:`--${_(a)}`,aliasesEnabled:e,aliasFormatted:s?`-${i.alias}`:void 0}}).map(a=>(a.aliasesEnabled=e,[{type:"flagName",data:a},{type:"flagDescription",data:a}]));return{type:"table",data:{tableData:n,tableBreakpoints:q}}}const C=t=>{var e;return!t||((e=t.version)!=null?e:t.help?t.help.version:void 0)},x=t=>{var e;const r="parent"in t&&((e=t.parent)==null?void 0:e.name);return(r?`${r} `:"")+t.name};function I(t){var e;const r=[];t.name&&r.push(x(t));const n=(e=C(t))!=null?e:"parent"in t&&C(t.parent);if(n&&r.push(`v${n}`),r.length!==0)return{id:"name",type:"text",data:`${r.join(" ")}
`}}function R(t){const{help:e}=t;if(!(!e||!e.description))return{id:"description",type:"text",data:`${e.description}
`}}function L(t){var e;const r=t.help||{};if("usage"in r)return r.usage?{id:"usage",type:"section",data:{title:"Usage:",body:Array.isArray(r.usage)?r.usage.join(`
`):r.usage}}:void 0;if(t.name){const n=[],a=[x(t)];if(t.flags&&Object.keys(t.flags).length>0&&a.push("[flags...]"),t.parameters&&t.parameters.length>0){const{parameters:i}=t,s=i.indexOf("--"),l=s>-1&&i.slice(s+1).some(o=>o.startsWith("<"));a.push(i.map(o=>o!=="--"?o:l?"--":"[--]").join(" "))}if(a.length>1&&n.push(a.join(" ")),"commands"in t&&((e=t.commands)==null?void 0:e.length)&&n.push(`${t.name} <command>`),n.length>0)return{id:"usage",type:"section",data:{title:"Usage:",body:n.join(`
`)}}}}function T(t){var e;if(!("commands"in t)||!((e=t.commands)==null?void 0:e.length))return;const r=t.commands.map(a=>[a.options.name,a.options.help?a.options.help.description:""]);return{id:"commands",type:"section",data:{title:"Commands:",body:{type:"table",data:{tableData:r,tableOptions:[{width:"content-width",paddingLeft:2,paddingRight:8}]}},indentBody:0}}}function k(t){if(!(!t.flags||Object.keys(t.flags).length===0))return{id:"flags",type:"section",data:{title:"Flags:",body:D(t.flags),indentBody:0}}}function H(t){const{help:e}=t;if(!e||!e.examples||e.examples.length===0)return;let{examples:r}=e;if(Array.isArray(r)&&(r=r.join(`
`)),r)return{id:"examples",type:"section",data:{title:"Examples:",body:r}}}function U(t){if(!("alias"in t)||!t.alias)return;const{alias:e}=t,r=Array.isArray(e)?e.join(", "):e;return{id:"aliases",type:"section",data:{title:"Aliases:",body:r}}}const J=t=>[I,R,L,T,k,H,U].map(e=>e(t)).filter(e=>Boolean(e)),M=N.WriteStream.prototype.hasColors();class V{text(e){return e}bold(e){return M?`\x1B[1m${e}\x1B[22m`:e.toLocaleUpperCase()}indentText({text:e,spaces:r}){return e.replace(/^/gm," ".repeat(r))}heading(e){return this.bold(e)}section({title:e,body:r,indentBody:n=2}){return`${(e?`${this.heading(e)}
`:"")+(r?this.indentText({text:this.render(r),spaces:n}):"")}
`}table({tableData:e,tableOptions:r,tableBreakpoints:n}){return B(e.map(a=>a.map(i=>this.render(i))),n?P(n):r)}flagParameter(e){return e===Boolean?"":e===String?"<string>":e===Number?"<number>":Array.isArray(e)?this.flagParameter(e[0]):"<value>"}flagOperator(){return" "}flagName({flag:e,flagFormatted:r,aliasesEnabled:n,aliasFormatted:a}){let i="";if(a?i+=`${a}, `:n&&(i+="    "),i+=r,"placeholder"in e&&typeof e.placeholder=="string")i+=`${this.flagOperator()}${e.placeholder}`;else{const s=this.flagParameter("type"in e?e.type:e);s&&(i+=`${this.flagOperator()}${s}`)}return i}flagDefault(e){return JSON.stringify(e)}flagDescription({flag:e}){var r;let n="description"in e&&(r=e.description)!=null?r:"";if("default"in e){let{default:a}=e;typeof a=="function"&&(a=a()),a&&(n+=` (default: ${this.flagDefault(a)})`)}return n}render(e){if(typeof e=="string")return e;if(Array.isArray(e))return e.map(r=>this.render(r)).join(`
`);if("type"in e&&this[e.type]){const r=this[e.type];if(typeof r=="function")return r.call(this,e.data)}throw new Error(`Invalid node type: ${JSON.stringify(e)}`)}}const y=/^[\w.-]+$/,{stringify:d}=JSON,W=/[|\\{}()[\]^$+*?.]/;function w(t){const e=[];let r,n;for(const a of t){if(n)throw new Error(`Invalid parameter: Spread parameter ${d(n)} must be last`);const i=a[0],s=a[a.length-1];let l;if(i==="<"&&s===">"&&(l=!0,r))throw new Error(`Invalid parameter: Required parameter ${d(a)} cannot come after optional parameter ${d(r)}`);if(i==="["&&s==="]"&&(l=!1,r=a),l===void 0)throw new Error(`Invalid parameter: ${d(a)}. Must be wrapped in <> (required parameter) or [] (optional parameter)`);let o=a.slice(1,-1);const f=o.slice(-3)==="...";f&&(n=a,o=o.slice(0,-3));const u=o.match(W);if(u)throw new Error(`Invalid parameter: ${d(a)}. Invalid character found ${d(u[0])}`);e.push({name:o,required:l,spread:f})}return e}function v(t,e,r,n){for(let a=0;a<e.length;a+=1){const{name:i,required:s,spread:l}=e[a],o=S(i);if(o in t)throw new Error(`Invalid parameter: ${d(i)} is used more than once.`);const f=l?r.slice(a):r[a];if(l&&(a=e.length),s&&(!f||l&&f.length===0))return console.error(`Error: Missing required parameter ${d(i)}
`),n(),process.exit(1);t[o]=f}}function F(t){return t===void 0||t!==!1}function A(t,e,r,n){const a={...e.flags},i=e.version;i&&(a.version={type:Boolean,description:"Show version"});const{help:s}=e,l=F(s);l&&!("help"in a)&&(a.help={type:Boolean,alias:"h",description:"Show help"});const o=j(a,n),f=()=>{console.log(e.version)};if(i&&o.flags.version===!0)return f(),process.exit(0);const u=new V,O=l&&(s==null?void 0:s.render)?s.render:c=>u.render(c),p=c=>{const m=J({...e,...c?{help:c}:{},flags:a});console.log(O(m,u))};if(l&&o.flags.help===!0)return p(),process.exit(0);if(e.parameters){let{parameters:c}=e,m=o._;const g=c.indexOf("--"),$=c.slice(g+1),h=Object.create(null);if(g>-1&&$.length>0){c=c.slice(0,g);const E=o._["--"];m=m.slice(0,-E.length||void 0),v(h,w(c),m,p),v(h,w($),E,p)}else v(h,w(c),m,p);Object.assign(o._,h)}const b={...o,showVersion:f,showHelp:p};return typeof r=="function"&&r(b),{command:t,...b}}function Z(t,e){const r=new Map;for(const n of e){const a=[n.options.name],{alias:i}=n.options;i&&(Array.isArray(i)?a.push(...i):a.push(i));for(const s of a){if(r.has(s))throw new Error(`Duplicate command name found: ${d(s)}`);r.set(s,n)}}return r.get(t)}function z(t,e,r=process.argv.slice(2)){if(!t)throw new Error("Options is required");if("name"in t&&(!t.name||!y.test(t.name)))throw new Error(`Invalid script name: ${d(t.name)}`);const n=r[0];if(t.commands&&y.test(n)){const a=Z(n,t.commands);if(a)return A(a.options.name,{...a.options,parent:t},a.callback,r.slice(1))}return A(void 0,t,e,r)}function G(t,e){if(!t)throw new Error("Command options are required");const{name:r}=t;if(t.name===void 0)throw new Error("Command name is required");if(!y.test(r))throw new Error(`Invalid command name ${JSON.stringify(r)}. Command names must be one word.`);return{options:t,callback:e}}export{z as cli,G as command};
