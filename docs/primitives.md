# UI Primitives

Reusable UI component library located in `src/components/primitives/`. All components use CSS Modules for styling.

## Import

```typescript
import { Button, Input, Select, Modal, Card } from '@/components/primitives';
```

---

## Components

### Buttons

#### Button
Standard button with variants and loading state.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'primary'` \| `'secondary'` \| `'ghost'` \| `'danger'` | `'primary'` | Visual style |
| `size` | `'sm'` \| `'md'` \| `'icon'` | `'md'` | Size preset |
| `loading` | boolean | `false` | Show spinner |
| `leftIcon` | ReactNode | — | Icon before text |
| `rightIcon` | ReactNode | — | Icon after text |

```tsx
<Button variant="primary" leftIcon={<Save />}>
  Save Changes
</Button>
```

#### IconButton
Icon-only button for toolbars.

#### FloatingActionButton
Fixed-position action button (FAB).

---

### Form Controls

#### Input
Text input with icon slots and error state.

| Prop | Type | Description |
|------|------|-------------|
| `leftIcon` | ReactNode | Icon inside left edge |
| `rightIcon` | ReactNode | Icon inside right edge |
| `error` | string | Error message to display |
| `label` | string | Optional built-in label |

```tsx
<Input 
  leftIcon={<Search />}
  placeholder="Search..." 
  error={errors.search}
/>
```

#### Select
Dropdown select with custom styling.

| Prop | Type | Description |
|------|------|-------------|
| `options` | `SelectOption[]` | Available options |
| `value` | string | Selected value |
| `onChange` | `(value: string) => void` | Change handler |
| `placeholder` | string | Placeholder text |
| `icon` | ReactNode | Icon in trigger |

```tsx
<Select
  options={[
    { value: 'C', label: 'Celsius' },
    { value: 'F', label: 'Fahrenheit' }
  ]}
  value={unit}
  onChange={setUnit}
/>
```

#### SearchableSelect
Select with search/filter functionality.

#### Switch
Toggle switch for boolean settings.

| Prop | Type | Description |
|------|------|-------------|
| `label` | string | Label text |
| `onCheckedChange` | `(checked: boolean) => void` | Change callback |

```tsx
<Switch 
  label="Enable notifications" 
  checked={enabled}
  onCheckedChange={setEnabled}
/>
```

#### Slider
Range input with visual track.

#### ToggleGroup
Single-select button group.

---

### Layout

#### Card
Container with consistent styling.

| Component | Description |
|-----------|-------------|
| `Card` | Root container, optional `hoverable` prop |
| `CardHeader` | Top section |
| `CardTitle` | Title text (h3) |
| `CardContent` | Main body |
| `CardFooter` | Bottom actions |

```tsx
<Card hoverable>
  <CardHeader>
    <CardTitle>Settings</CardTitle>
  </CardHeader>
  <CardContent>
    {/* form fields */}
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

#### List
Styled list container with items.

---

### Overlays

#### Modal
Portal-based dialog with size variants.

| Component | Props | Description |
|-----------|-------|-------------|
| `Modal` | `isOpen`, `onClose`, `size` | Root modal |
| `ModalContent` | — | Content wrapper |
| `ModalHeader` | `title`, `description`, `onClose` | Header with close button |
| `ModalBody` | — | Scrollable body |
| `ModalFooter` | — | Action buttons |
| `ModalSidebar` | `title`, `icon`, `footer` | Optional sidebar |
| `ModalSidebarItem` | `active`, `icon` | Sidebar nav item |

**Sizes:** `sm`, `md`, `lg`, `xl`, `full`

```tsx
<Modal isOpen={isOpen} onClose={close} size="lg">
  <ModalContent>
    <ModalHeader title="Edit Widget" onClose={close} />
    <ModalBody>
      {/* form content */}
    </ModalBody>
    <ModalFooter>
      <Button variant="ghost" onClick={close}>Cancel</Button>
      <Button onClick={save}>Save</Button>
    </ModalFooter>
  </ModalContent>
</Modal>
```

---

### Specialized

#### CitySearch
Location search with autocomplete for weather/timezone selection.

#### IntegrationSelect
Dropdown for selecting saved integrations.

#### Label
Form field label with optional required indicator.

#### Badge
Status/count indicator.

---

## File Structure

Each primitive follows this structure:

```
component-name/
├── ComponentName.tsx        # React component
├── ComponentName.module.css # Scoped styles
└── index.ts                 # Re-exports
```

All primitives are re-exported from `src/components/primitives/index.ts`.

---

## Design Tokens

Primitives use CSS custom properties for theming:

```css
--bg-primary, --bg-secondary, --bg-tertiary
--text-primary, --text-secondary, --text-muted
--accent, --accent-hover
--border-color, --border-radius
--shadow-sm, --shadow-md, --shadow-lg
```
