import React from 'react';
import { render } from 'ink';
import { PanelStack } from '../../src/components/PanelStack.js';
import { parseExecArg, runExec } from '../../src/index.js';
import { EditorPanel } from './EditorPanel.js';
import type { EditorPanelData } from './EditorPanel.js';
import * as yaml from 'js-yaml';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';

const execCmd = parseExecArg();

// Accept optional CLI args: yaml-editor [config.yaml] [schema.json]
const yamlPath = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(import.meta.dirname, 'sample-config.yaml');

const schemaPath = process.argv[3]
  ? resolve(process.argv[3])
  : resolve(import.meta.dirname, 'schema.json');

const yamlContent = readFileSync(yamlPath, 'utf-8');
const schemaContent = readFileSync(schemaPath, 'utf-8');
const yamlData = yaml.load(yamlContent) as Record<string, unknown>;
const schema = JSON.parse(schemaContent);

const rootPanel = {
  id: 'yaml-editor',
  title: basename(yamlPath),
  component: EditorPanel,
  data: {
    title: `Editing: ${basename(yamlPath)}`,
    filePath: yamlPath,
    yaml: yamlData,
    schema,
    onSave: (updatedYaml: Record<string, unknown>) => {
      const output = yaml.dump(updatedYaml, {
        lineWidth: -1,
        quotingType: "'",
        forceQuotes: false,
      });
      writeFileSync(yamlPath, output, 'utf-8');
      if (execCmd) runExec(execCmd);
    },
  } satisfies EditorPanelData,
  state: { type: 'yaml-editor', file: yamlPath },
};

const { unmount } = render(
  <PanelStack
    appName="yaml-editor"
    initialPanel={rootPanel}
    onExit={() => {
      unmount();
      process.exit(0);
    }}
  />,
);
