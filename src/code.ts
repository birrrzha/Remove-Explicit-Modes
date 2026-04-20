figma.showUI(__html__, { width: 340, height: 420 })

type ExplicitEntry = {
  collectionId: string
  modeId: string
  libraryName: string
  modeName: string
}

function walkSceneSubtree(node: BaseNode, visit: (n: SceneNode) => void): void {
  if ('explicitVariableModes' in node) {
    visit(node as SceneNode)
  }
  if ('children' in node) {
    for (const child of node.children) {
      walkSceneSubtree(child, visit)
    }
  }
}

function collectExplicitPairsFromSelection(): Map<string, { collectionId: string; modeId: string }> {
  const pairs = new Map<string, { collectionId: string; modeId: string }>()
  for (const root of figma.currentPage.selection) {
    walkSceneSubtree(root, (sceneNode) => {
      const modes = sceneNode.explicitVariableModes
      for (const collectionId of Object.keys(modes)) {
        const modeId = modes[collectionId]
        pairs.set(`${collectionId}\0${modeId}`, { collectionId, modeId })
      }
    })
  }
  return pairs
}

async function buildEntries(): Promise<ExplicitEntry[]> {
  const pairMap = collectExplicitPairsFromSelection()
  if (pairMap.size === 0) {
    return []
  }

  let libraryByKey: Map<string, string>
  try {
    const libs = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()
    libraryByKey = new Map(libs.map((l) => [l.key, l.libraryName]))
  } catch (_err) {
    libraryByKey = new Map()
  }

  type Raw = ExplicitEntry & { collectionTitle: string }
  const raw: Raw[] = []
  for (const { collectionId, modeId } of pairMap.values()) {
    const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
    const modeName =
      collection?.modes.find((m) => m.modeId === modeId)?.name ?? '(unknown mode)'

    let libraryName: string
    let collectionTitle: string
    if (!collection) {
      libraryName = '(unknown library)'
      collectionTitle = collectionId
    } else if (collection.remote) {
      libraryName = libraryByKey.get(collection.key) ?? collection.name
      collectionTitle = collection.name
    } else {
      libraryName = figma.root.name
      collectionTitle = collection.name
    }

    raw.push({ collectionId, modeId, libraryName, modeName, collectionTitle })
  }

  const labelCounts = new Map<string, number>()
  for (const e of raw) {
    const label = `${e.libraryName}\0${e.modeName}`
    labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1)
  }

  const entries = raw.map((e) => {
    const label = `${e.libraryName}\0${e.modeName}`
    const needsDisambiguation = (labelCounts.get(label) ?? 0) > 1
    const libraryName = needsDisambiguation
      ? `${e.libraryName} · ${e.collectionTitle}`
      : e.libraryName
    return {
      collectionId: e.collectionId,
      modeId: e.modeId,
      libraryName,
      modeName: e.modeName,
    }
  })
  entries.sort((a, b) => a.libraryName.localeCompare(b.libraryName) || a.modeName.localeCompare(b.modeName))
  return entries
}

async function pushExplicitList(): Promise<void> {
  const selectionEmpty = figma.currentPage.selection.length === 0
  if (selectionEmpty) {
    figma.ui.postMessage({ type: 'explicit-list', entries: [], selectionEmpty: true })
    return
  }
  const entries = await buildEntries()
  figma.ui.postMessage({ type: 'explicit-list', entries, selectionEmpty: false })
}

async function clearExplicitOnMatchingNodesAsync(collectionId: string, modeId: string): Promise<void> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(collectionId)
  if (!collection) {
    return
  }
  for (const root of figma.currentPage.selection) {
    walkSceneSubtree(root, (sceneNode) => {
      const modes = sceneNode.explicitVariableModes
      if (modes[collectionId] === modeId) {
        sceneNode.clearExplicitVariableModeForCollection(collection)
      }
    })
  }
}

void pushExplicitList()

figma.on('selectionchange', () => {
  void pushExplicitList()
})

figma.ui.onmessage = (msg: { type: string; collectionId?: string; modeId?: string }) => {
  if (msg.type === 'refresh') {
    void pushExplicitList()
    return
  }
  if (msg.type === 'remove-explicit' && msg.collectionId && msg.modeId) {
    void clearExplicitOnMatchingNodesAsync(msg.collectionId, msg.modeId).then(() => {
      void pushExplicitList()
    })
  }
}
