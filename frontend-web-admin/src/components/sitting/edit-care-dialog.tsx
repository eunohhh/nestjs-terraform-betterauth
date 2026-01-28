'use client';

import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateCare } from '@/hooks/queries';
import { SittingCare } from '@/lib/apis/api-client';

interface EditCareDialogProps {
  care: SittingCare | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCareDialog({ care, open, onOpenChange }: EditCareDialogProps) {
  const updateCare = useUpdateCare();
  const [formData, setFormData] = useState({
    careTimeKst: '',
    note: '',
  });

  useEffect(() => {
    if (care) {
      setFormData({
        careTimeKst: care.careTime ? format(new Date(care.careTime), "yyyy-MM-dd'T'HH:mm") : '',
        note: care.note || '',
      });
    }
  }, [care]);

  const handleSubmit = async () => {
    if (!care) return;
    await updateCare.mutateAsync({
      careId: care.id,
      dto: formData,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Care</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="careTimeKst">Care Time (KST)</Label>
            <Input
              id="careTimeKst"
              type="datetime-local"
              value={formData.careTimeKst}
              onChange={(e) => setFormData({ ...formData, careTimeKst: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateCare.isPending}>
            {updateCare.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
