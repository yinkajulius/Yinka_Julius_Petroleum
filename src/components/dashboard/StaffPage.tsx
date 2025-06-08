import React, { useState, useEffect, useRef } from 'react';
import { Pencil, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

interface StaffPageProps {
  stationId: string;
}

interface Staff {
  id: string;
  name: string;
  position: string;
  phone: string;
  social_media: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
  picture?: string;
  date_of_employment: string;
  birthday: string;
}

const StaffPage: React.FC<StaffPageProps> = ({ stationId }) => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStaff, setEditStaff] = useState<Staff | null>(null);
  const [form, setForm] = useState<Partial<Staff>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch staff from Supabase
  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from('staff')
        .select('*')
        .eq('station_id', stationId)
        .order('date_of_employment', { ascending: false });
      if (error) {
        setError(error.message || 'Failed to load staff');
        setStaffList([]);
      } else {
        setStaffList(
          (data || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            position: s.position,
            phone: s.phone,
            picture: s.picture,
            date_of_employment:s.date_of_employment,
            birthday: s.birthday,
            social_media:
              typeof s.social_media === 'string'
                ? JSON.parse(s.social_media)
                : s.social_media || {},
          }))
        );
      }
      setLoading(false);
    };
    fetchStaff();
  }, [stationId]);

  const openAddDialog = () => {
    setEditStaff(null);
    setForm({});
    setDialogOpen(true);
  };

  const openEditDialog = (staff: Staff) => {
    setEditStaff(staff);
    setForm(staff);
    setDialogOpen(true);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      social_media: { ...prev.social_media, [name]: value },
    }));
  };

  async function uploadStaffPhoto(file: File, staffName: string) {
    const fileExt = file.name.split('.').pop();
    const filePath = `staff/${stationId}_${staffName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from('staff-photos')
      .upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data: publicUrlData } = supabase.storage
      .from('staff-photos')
      .getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUploading(false);
    if (!form.name || !form.position) return;
    let pictureUrl = form.picture;
    // If a file is selected, upload it
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      setUploading(true);
      try {
        pictureUrl = await uploadStaffPhoto(file, form.name);
      } catch (uploadErr: any) {
        setError(uploadErr.message || 'Failed to upload image');
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    if (editStaff) {
      // Update staff in DB
      const { error } = await supabase
        .from('staff')
        .update({
          ...form,
          picture: pictureUrl,
          social_media: form.social_media ? JSON.stringify(form.social_media) : null,
        })
        .eq('id', editStaff.id);
      if (error) {
        setError(error.message || 'Failed to update staff');
        return;
      }
    } else {
      // Add new staff to DB
      const { error } = await supabase
        .from('staff')
        .insert({
          station_id: stationId,
          name: form.name as string,
          position: form.position as string,
          phone: form.phone,
          picture: pictureUrl,
          date_of_employment: form.date_of_employment,
          birthday: form.birthday,
          social_media: form.social_media ? form.social_media : null,
        });
      if (error) {
        setError(error.message || 'Failed to add staff');
        return;
      }
    }
    setDialogOpen(false);
    // Refresh staff list
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('staff')
      .select('*')
      .eq('station_id', stationId)
      .order('date_of_employment', { ascending: false });
    setStaffList(
      (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        phone: s.phone,
        picture: s.picture,
        date_of_employment: s.date_of_employment ,
        birthday: s.birthday,
        social_media:
          typeof s.social_media === 'string'
            ? JSON.parse(s.social_media)
            : s.social_media || {},
      }))
    );
    setLoading(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4">
      <div className="text-center mb-10">
       
        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-4">
          We are the people who
          <br />
          make up Our Station
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Our philosophy is simple: hire great people and give them the resources
          and support to do their best work.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {staffList.map((staff) => (
          <div
            key={staff.id}
            className="bg-white rounded-xl shadow p-6 flex flex-col items-center text-center relative group"
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-green-600 p-1 rounded-full bg-white shadow group-hover:opacity-100 opacity-80"
              onClick={() => openEditDialog(staff)}
              aria-label={`Edit ${staff.name}`}
              type="button"
            >
              <Pencil size={18} />
            </button>
            <img
              src={staff.picture || '/placeholder.svg'}
              alt={staff.name}
              className="w-24 h-24 rounded-full object-cover mb-4 border"
            />
            <div className="font-semibold text-lg text-gray-900">
              {staff.name}
            </div>
            <div className="text-green-700 font-medium text-sm mb-2">
              {staff.position}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Phone: {staff.phone}
            </div>
            <div className="flex gap-2 justify-center mb-2">
              {staff.social_media.facebook && (
                <a
                  href={`https://facebook.com/${staff.social_media.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs flex items-center"
                  title="Facebook"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-1"
                  >
                    <path d="M22.675 0h-21.35C.595 0 0 .592 0 1.326v21.348C0 23.408.595 24 1.325 24h11.495v-9.294H9.692v-3.622h3.128V8.413c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.797.143v3.24l-1.918.001c-1.504 0-1.797.715-1.797 1.763v2.313h3.587l-.467 3.622h-3.12V24h6.116C23.406 24 24 23.408 24 22.674V1.326C24 .592 23.406 0 22.675 0" />
                  </svg>
                </a>
              )}
              {staff.social_media.twitter && (
                <a
                  href={`https://twitter.com/${staff.social_media.twitter}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline text-xs flex items-center"
                  title="Twitter"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-1"
                  >
                    <path d="M24 4.557a9.93 9.93 0 0 1-2.828.775 4.932 4.932 0 0 0 2.165-2.724c-.951.564-2.005.974-3.127 1.195A4.92 4.92 0 0 0 16.616 3c-2.73 0-4.942 2.21-4.942 4.936 0 .39.045.765.127 1.124C7.728 8.89 4.1 6.89 1.671 3.905c-.427.722-.666 1.561-.666 2.475 0 1.708.87 3.216 2.188 4.099a4.904 4.904 0 0 1-2.237-.616c-.054 2.281 1.581 4.415 3.949 4.89-.386.104-.793.16-1.213.16-.297 0-.583-.028-.862-.08.584 1.823 2.28 3.152 4.29 3.188A9.868 9.868 0 0 1 0 21.543a13.94 13.94 0 0 0 7.548 2.209c9.057 0 14.009-7.496 14.009-13.986 0-.213-.005-.425-.014-.636A9.936 9.936 0 0 0 24 4.557z" />
                  </svg>
                </a>
              )}
              {staff.social_media.instagram && (
                <a
                  href={`https://instagram.com/${staff.social_media.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:underline text-xs flex items-center"
                  title="Instagram"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-1"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608C2.175 15.647 2.163 15.267 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.332.013 7.052.072 5.771.131 4.659.414 3.678 1.395 2.697 2.376 2.414 3.488 2.355 4.769.013 8.332 0 8.741 0 12c0 3.259.013 3.668.072 4.948.059 1.281.342 2.393 1.323 3.374.981.981 2.093 1.264 3.374 1.323C8.332 23.987 8.741 24 12 24c3.259 0 3.668-.013 4.948-.072 1.281-.059 2.393-.342 3.374-1.323.981-.981 1.264-2.093 1.323-3.374.059-1.28.072-1.689.072-4.948 0-3.259-.013-3.668-.072-4.948-.059-1.281-.342-2.393-1.323-3.374-.981-.981-2.093-1.264-3.374-1.323C15.668.013 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
                  </svg>
                </a>
              )}
              {staff.social_media.linkedin && (
                <a
                  href={`https://linkedin.com/in/${staff.social_media.linkedin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 hover:underline text-xs flex items-center"
                  title="LinkedIn"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="mr-1"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.761 0 5-2.239 5-5v-14c0-2.761-2.239-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm13.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.968v5.699h-3v-10h2.881v1.367h.041c.401-.761 1.381-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.599v5.597z" />
                  </svg>
                </a>
              )}
            </div>
            <div className="text-xs text-gray-400 mb-1">
              Employed: {staff.date_of_employment}
            </div>
            <div className="text-xs text-gray-400">
              Birthday: {staff.birthday}
            </div>
          </div>
        ))}
        <div
          className="flex flex-col items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-6 min-h-[220px] cursor-pointer hover:bg-gray-100"
          onClick={openAddDialog}
        >
          <Plus className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-2xl mb-2" />
          <span className="text-gray-500 text-sm">Add new staff</span>
        </div>
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editStaff ? 'Edit Staff' : 'Add New Staff'}
            </DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              name="name"
              placeholder="Name"
              value={form.name || ''}
              onChange={handleFormChange}
              required
            />
            <Input
              name="position"
              placeholder="Position"
              value={form.position || ''}
              onChange={handleFormChange}
              required
            />
            <Input
              name="phone"
              placeholder="Phone"
              value={form.phone || ''}
              onChange={handleFormChange}
            />
            <Input
              name="picture"
              placeholder="Picture URL"
              value={form.picture || ''}
              onChange={handleFormChange}
            />
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              className="block w-full text-xs text-gray-500 mb-2"
            />
            {uploading && (
              <div className="text-xs text-blue-500">Uploading image...</div>
            )}
            <Input
              name="date_of_employment"
              type="date"
              placeholder="Date of Employment"
              value={form.date_of_employment || ''}
              onChange={handleFormChange}
            />
            <Input
              name="birthday"
              type="date"
              placeholder="Birthday"
              value={form.birthday || ''}
              onChange={handleFormChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                name="facebook"
                placeholder="Facebook"
                value={form.social_media?.facebook || ''}
                onChange={handleSocialChange}
              />
              <Input
                name="twitter"
                placeholder="Twitter"
                value={form.social_media?.twitter || ''}
                onChange={handleSocialChange}
              />
              <Input
                name="instagram"
                placeholder="Instagram"
                value={form.social_media?.instagram || ''}
                onChange={handleSocialChange}
              />
              <Input
                name="linkedin"
                placeholder="LinkedIn"
                value={form.social_media?.linkedin || ''}
                onChange={handleSocialChange}
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
            >
              {editStaff ? 'Save Changes' : 'Add Staff'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
      {loading && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-green-400"></div>
        </div>
      )}
      {error && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-md max-w-sm mx-auto">
            <p className="text-red-500 font-semibold mb-4">{error}</p>
            <button
              onClick={() => setError(null)}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPage;
