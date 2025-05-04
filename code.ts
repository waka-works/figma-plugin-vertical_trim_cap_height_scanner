figma.showUI(__html__, {
  width: 300,
  height: 318
});

figma.ui.onmessage = async (pluginMessage) => {
  // Receive button click, search for text, and pass it
  if (pluginMessage.type === "from_ui-click_scanButton") {

    // Type declaration
    type extractedProperty = { ancestorNodeType: string, id: string, text: string };
    let scanResults: extractedProperty[] = [];

    // Check if the text is an instance first, and then if it's a main component
    function checkAncestor(node: BaseNode & ChildrenMixin | null): string {
      if (node) {
        let currentNode = node.parent;
        while (currentNode) {
          if (currentNode.type === "INSTANCE") {
            return currentNode.type;
          } else if (currentNode.type === "COMPONENT") {
            return currentNode.type;
          };
          currentNode = currentNode.parent;
        };
      };
      return "";
    };

    // Returns search results
    async function findResults(): Promise<void> {
      return new Promise((resolve) => {
      // Search for text with top and bottom trimming set
      const currentPage = figma.currentPage;
      const textNodes = currentPage.findAll(
        node => node.type === "TEXT" && (node as TextNode).leadingTrim === "CAP_HEIGHT") as TextNode[];

      // Pass the necessary properties for display to ui.html from the search results
      if (textNodes) {
        textNodes.forEach((element, index) => {
          let ancestorNode = checkAncestor(element.parent);
          let scanText = { ancestorNodeType: ancestorNode, id: element.id, text: element.characters };
          scanResults = [...scanResults, scanText];
        });
        figma.ui.postMessage({
          type: "from_code-scan_results",
          scanResult: scanResults,
          countResult: scanResults.length
        });
      }
      resolve();
      });
    };

    // For timeout
    function timeout(ms: number): Promise<never> {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Text scan timed out."));
        }, ms);
      });
    };

    // Display timeout if the process takes too long
    async function findWithTimeout(ms: number) {
      try {
        await Promise.race([
          // Return the promise that resolves or rejects first
          findResults(),
          timeout(ms)
        ]);
      } catch (error) {
        // Display in UI on error
        if (error instanceof Error) {
            figma.ui.postMessage({
              type: "from_code-error_timeout",
              message: error.message
            });
        };
      };
    };
    findWithTimeout(5000);
  };

  // Receive the click on a search result and set the text to the selected state
  if (pluginMessage.type === "from_ui-select") {
    const searchNode = await figma.getNodeByIdAsync(pluginMessage.nodeId);
    if (searchNode) {
      figma.viewport.scrollAndZoomIntoView([searchNode as SceneNode]);
      figma.currentPage.selection = [searchNode as SceneNode];
    } else {
      figma.notify("No text found to select.");
    };
  };
};