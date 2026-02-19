import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PanelProps, DetailField } from '../types.js';

interface DetailPanelData {
  /** Title shown at the top */
  title: string;
  /** List of fields to display */
  fields: DetailField[];
  /** Optional actions the user can take (shown at the bottom) */
  actions?: Array<{
    key: string;
    label: string;
    handler: (panelProps: PanelProps<DetailPanelData>) => void;
  }>;
}

export function DetailPanel(props: PanelProps<DetailPanelData>) {
  const { data, width, height, updateState } = props;
  const { title, fields, actions } = data;
  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedField, setSelectedField] = useState(0);

  const actionLines = actions && actions.length > 0 ? 2 : 0;
  const headerLines = 2; // title + separator
  const visibleFields = Math.max(1, height - headerLines - actionLines);

  useEffect(() => {
    if (selectedField < scrollOffset) {
      setScrollOffset(selectedField);
    } else if (selectedField >= scrollOffset + visibleFields) {
      setScrollOffset(selectedField - visibleFields + 1);
    }
  }, [selectedField, scrollOffset, visibleFields]);

  useEffect(() => {
    updateState({
      title,
      selectedField: fields[selectedField]?.label,
      fieldCount: fields.length,
    });
  }, [selectedField, title, fields]);

  useInput((input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedField(prev => Math.max(0, prev - 1));
    } else if (key.downArrow || input === 'j') {
      setSelectedField(prev => Math.min(fields.length - 1, prev + 1));
    }

    // Handle action hotkeys
    if (actions) {
      for (const action of actions) {
        if (input === action.key) {
          action.handler(props);
          return;
        }
      }
    }
  });

  // Calculate label width for alignment
  let maxLabelWidth = 0;
  for (const field of fields) {
    maxLabelWidth = Math.max(maxLabelWidth, field.label.length);
  }
  maxLabelWidth = Math.min(maxLabelWidth, Math.floor(width * 0.3));

  const windowFields = fields.slice(scrollOffset, scrollOffset + visibleFields);

  return (
    <Box flexDirection="column" width={width} height={height}>
      {/* Title */}
      <Box>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Box>
        <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
      </Box>

      {/* Fields */}
      {windowFields.map((field, windowIdx) => {
        const actualIdx = scrollOffset + windowIdx;
        const isSelected = actualIdx === selectedField;
        const valueStr = field.value == null ? '—' : String(field.value);

        return (
          <Box key={field.label}>
            <Text color={isSelected ? 'cyan' : undefined}>
              {isSelected ? '> ' : '  '}
            </Text>
            <Text bold dimColor={!isSelected}>
              {field.label.padEnd(maxLabelWidth)}
            </Text>
            <Text dimColor> : </Text>
            <Text
              color={field.color as any ?? (isSelected ? 'white' : undefined)}
              bold={isSelected}
            >
              {valueStr}
            </Text>
          </Box>
        );
      })}

      <Box flexGrow={1} />

      {/* Actions */}
      {actions && actions.length > 0 && (
        <>
          <Box>
            <Text dimColor>{'─'.repeat(Math.min(width, 200))}</Text>
          </Box>
          <Box gap={2}>
            {actions.map(action => (
              <Text key={action.key} dimColor>
                <Text color="yellow">[{action.key}]</Text> {action.label}
              </Text>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
