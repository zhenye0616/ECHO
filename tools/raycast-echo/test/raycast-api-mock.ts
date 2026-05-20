import React from "react";

function component(name: string) {
  const fn = (props: Record<string, unknown>) => React.createElement(name, props, props.children as React.ReactNode);
  Object.defineProperty(fn, "name", { value: name });
  return fn;
}

export const Color = {
  Blue: "blue",
  Green: "green",
  Orange: "orange",
  Purple: "purple",
  Red: "red",
  SecondaryText: "secondary",
};

export const Icon = {
  ArrowDown: "arrow-down",
  Circle: "circle",
  Clipboard: "clipboard",
  Code: "code",
  CodeBlock: "code-block",
  Document: "document",
  Dot: "dot",
  Globe: "globe",
  List: "list",
  MagnifyingGlass: "magnifying-glass",
  Plus: "plus",
  RotateClockwise: "rotate-clockwise",
  Stars: "stars",
  Terminal: "terminal",
  Text: "text",
  Trash: "trash",
  XMarkCircle: "x",
};

export const Action = Object.assign(component("Action"), {
  CopyToClipboard: component("Action.CopyToClipboard"),
  Open: component("Action.Open"),
  Paste: component("Action.Paste"),
  Push: component("Action.Push"),
  Style: { Destructive: "destructive" },
});

export const ActionPanel = Object.assign(component("ActionPanel"), {
  Section: component("ActionPanel.Section"),
});

export const Alert = { ActionStyle: { Destructive: "destructive" } };

export const Detail = Object.assign(component("Detail"), {
  Metadata: Object.assign(component("Detail.Metadata"), {
    Label: component("Detail.Metadata.Label"),
    Separator: component("Detail.Metadata.Separator"),
    TagList: Object.assign(component("Detail.Metadata.TagList"), {
      Item: component("Detail.Metadata.TagList.Item"),
    }),
  }),
});

export const List = Object.assign(component("List"), {
  Section: component("List.Section"),
  Item: Object.assign(component("List.Item"), {
    Detail: component("List.Item.Detail"),
  }),
  EmptyView: component("List.EmptyView"),
  Dropdown: Object.assign(component("List.Dropdown"), {
    Item: component("List.Dropdown.Item"),
  }),
});

const store = new Map<string, string | number | boolean>();

export const LocalStorage = {
  async getItem(key: string) {
    return store.get(key);
  },
  async setItem(key: string, value: string | number | boolean) {
    store.set(key, value);
  },
  async removeItem(key: string) {
    store.delete(key);
  },
  async allItems() {
    return Object.fromEntries(store.entries());
  },
  __clear() {
    store.clear();
  },
};

export const Toast = { Style: { Failure: "failure", Success: "success" } };
export const Clipboard = { copy: async () => undefined, paste: async () => undefined };
export const open = async () => undefined;
export const getFrontmostApplication = async () => ({ name: "Cursor" });
export const getPreferenceValues = <T,>() => ({}) as T;
export const showToast = async () => undefined;
export const confirmAlert = async () => true;
export const useNavigation = () => ({ push: () => undefined, pop: () => undefined });
export const popToRoot = () => undefined;
