import { Chain, NamedChain } from '@ephox/agar';
import { Fun, Option } from '@ephox/katamari';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Editor, IAllProps } from '../../../main/ts/components/Editor';

export interface Context {
  DOMNode: Element;
  editor: any;
  ref: any;
}

const getRoot = () => {
  return Option.from(document.getElementById('root')).getOrThunk(() => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
    return root;
  });
};

const cRender = (props: IAllProps) => {
  return Chain.async<Context, Context>((_, next, die) => {
    const originalInit = props.init || {};
    const originalSetup = originalInit.setup || Fun.noop;
    let ref: any = null;

    const init: Record<string, any> = {
      ...originalInit,
      setup: (editor: any) => {
        originalSetup(editor);

        editor.on('SkinLoaded', () => {
          setTimeout(() => {
            Option.from(ref)
            .map(ReactDOM.findDOMNode)
            .filter((val) => val instanceof Element)
            .fold(() => die('Could not find DOMNode'), (DOMNode) => {
              next({
                ref,
                editor,
                DOMNode: DOMNode as Element
              });
            });
          }, 0);
        });
      }
    };

    /**
     * NOTE: TinyMCE will manipulate the DOM directly and this may cause issues with React's virtual DOM getting
     * out of sync. The official fix for this is wrap everything (textarea + editor) in an element. As far as React
     * is concerned, the wrapper always only has a single child, thus ensuring that React doesn’t have a reason to
     * touch the nodes created by TinyMCE. Since this only seems to be an issue when rendering TinyMCE 4 directly
     * into a root and a fix would be a breaking change, let's just wrap the editor in a <div> here for now.
     */
    ReactDOM.render(<div><Editor ref={r => ref = r} {...props} init={init} /></div>, getRoot());
  });
};

// By rendering the Editor into the same root, React will perform a diff and update.
const cReRender = (props: IAllProps) => {
  return Chain.op<Context>((context) => {
    ReactDOM.render(<div><Editor ref={r => context.ref = r} {...props} /></div>, getRoot());
  });
};

const cRemove = Chain.op((_) => {
  ReactDOM.unmountComponentAtNode(getRoot());
});

const cNamedChainDirect = (name: keyof Context) => NamedChain.direct(
  NamedChain.inputName(),
  Chain.mapper((res: Context) => res[name]),
  name
);

const cDOMNode = (chain: Chain<any, any>) => {
  return NamedChain.asChain([
    cNamedChainDirect('DOMNode'),
    NamedChain.read('DOMNode', chain),
    NamedChain.outputInput
  ]);
};

const cEditor = (chain: Chain<any, any>) => {
  return NamedChain.asChain([
    cNamedChainDirect('editor'),
    NamedChain.read('editor', chain),
    NamedChain.outputInput
  ]);
};

export {
  cRender,
  cReRender,
  cRemove,
  cNamedChainDirect,
  cDOMNode,
  cEditor
};
