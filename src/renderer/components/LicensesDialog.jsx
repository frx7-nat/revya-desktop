// src/renderer/components/LicensesDialog.jsx
// Diálogo "Licenças de terceiros": atribuição dos binários externos que o
// Revya embute sem modificar (scrcpy, ADB). Mesmo tema/estrutura visual do
// DexGuideDialog — informativo, sem ação a tomar além de fechar.

import React from 'react';
import {
  Dialog, DialogContent, Box, Typography, Link, Stack, IconButton, Divider, Slide,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  THIRD_PARTY_COMPONENTS, LICENSES_TITLE_KEY, LICENSES_INTRO_KEY,
  LICENSES_LICENSED_UNDER_KEY, LICENSES_PROJECT_LABEL_KEY,
} from '../data/thirdPartyNotices';
import { useT } from '../i18n';

const SlideUp = React.forwardRef(function SlideUp(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function ComponentCard({ component, isLast }) {
  const { t } = useT();
  return (
    <Box sx={{ pb: isLast ? 0 : 2, mb: isLast ? 0 : 2, borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.06)' }}>
      <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.88rem', mb: 0.4 }}>
        {component.name}
      </Typography>

      {component.copyrightLines.map((line) => (
        <Typography key={line} variant="caption" color="text.secondary"
          sx={{ display: 'block', fontSize: '0.74rem', lineHeight: 1.5 }}>
          {line}
        </Typography>
      ))}

      <Typography variant="caption" color="text.secondary"
        sx={{ display: 'block', fontSize: '0.74rem', lineHeight: 1.5, mt: 0.4 }}>
        {t(LICENSES_LICENSED_UNDER_KEY, { license: component.licenseName, file: component.licenseFile })}
      </Typography>

      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.6 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.74rem' }}>
          {t(LICENSES_PROJECT_LABEL_KEY)}
        </Typography>
        <Link href={component.projectUrl} target="_blank" rel="noopener noreferrer"
          sx={{ fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 0.3 }}>
          {component.projectUrl}
          <OpenInNewIcon sx={{ fontSize: 12 }} />
        </Link>
      </Stack>
    </Box>
  );
}

export default function LicensesDialog({ open, onClose }) {
  const { t } = useT();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={SlideUp}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          background: 'linear-gradient(160deg, #20242E 0%, #16151B 70%)',
          border: '1px solid rgba(255,185,74,0.18)',
        },
      }}
    >
      <IconButton onClick={onClose} size="small"
        sx={{ position: 'absolute', top: 10, right: 10, color: 'text.secondary', zIndex: 2 }}>
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent sx={{ px: 3.5, py: 3.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1.1rem', mb: 1 }}>
          {t(LICENSES_TITLE_KEY)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.55, mb: 2.5 }}>
          {t(LICENSES_INTRO_KEY)}
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {THIRD_PARTY_COMPONENTS.map((component, i) => (
          <ComponentCard key={component.id} component={component}
            isLast={i === THIRD_PARTY_COMPONENTS.length - 1} />
        ))}
      </DialogContent>
    </Dialog>
  );
}
