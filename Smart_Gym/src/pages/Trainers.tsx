import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Star, Search, Calendar, DollarSign, Award, User,
  Briefcase, CheckCircle, ArrowRight, X, Clock, Users, MessageSquarePlus,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import RequestSessionDialog from '@/components/RequestSessionDialog';

interface Trainer {
  _id: string;
  name: string;
  email: string;
  trainerProfile: {
    specializations: string[];
    certifications: string[];
    experience: number;
    hourlyRate: number;
    sessionTypes: Array<{ type: string; duration: number; price: number; description: string }>;
    rating: { average: number; count: number };
    completedSessions: number;
    bio?: string;
    profileImage?: string;
  };
}

const getInitials = (name: string) =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const StarRating = ({ value, count }: { value: number; count: number }) => {
  if (!count || count === 0) {
    return <span className="text-xs text-gray-400">No reviews yet</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex">
        {[1, 2, 3, 4, 5].map(s => (
          <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-700">{value.toFixed(1)}</span>
      <span className="text-xs text-gray-400">({count})</span>
    </div>
  );
};

const Trainers: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [modalReviews, setModalReviews] = useState<any[]>([]);
  const [modalReviewsLoading, setModalReviewsLoading] = useState(false);
  const [requestTrainer, setRequestTrainer] = useState<Trainer | null>(null);

  useEffect(() => { fetchTrainers(); }, []);

  useEffect(() => {
    if (!selectedTrainer) { setModalReviews([]); return; }
    setModalReviewsLoading(true);
    apiService.getTrainerById(selectedTrainer._id)
      .then((data: any) => setModalReviews(data.recentReviews || []))
      .catch(() => setModalReviews([]))
      .finally(() => setModalReviewsLoading(false));
  }, [selectedTrainer]);

  const fetchTrainers = async () => {
    try {
      const data = await apiService.getAllTrainers();
      setTrainers(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) { fetchTrainers(); return; }
    try {
      setLoading(true);
      const data = await apiService.getAllTrainers({ search: searchTerm });
      setTrainers(data);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleBook = (trainer: Trainer) => {
    if (!user) {
      toast({ title: 'Login required', description: 'Please log in to book a session', variant: 'destructive' });
      return;
    }
    if (user.userType === 'trainer') {
      toast({ title: 'Not available', description: 'Trainers cannot book sessions', variant: 'destructive' });
      return;
    }
    navigate(`/book-trainer/${trainer._id}`);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading trainers...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Find Your Trainer</h1>
            <p className="text-lg text-gray-500 mb-8">Connect with certified fitness professionals and start your journey</p>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name or specialization..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-11 bg-gray-50 border-gray-200"
                />
              </div>
              <Button onClick={handleSearch} className="h-11 px-6">Search</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        {trainers.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No trainers found</h3>
            <p className="text-gray-500">Try adjusting your search</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6">{trainers.length} trainer{trainers.length !== 1 ? 's' : ''} available</p>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {trainers.map(trainer => (
                <div key={trainer._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
                  {/* Card top accent */}
                  <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />

                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start gap-4 mb-5">
                      <div className="relative">
                        <Avatar className="w-16 h-16 ring-2 ring-white shadow">
                          <AvatarImage src={trainer.trainerProfile.profileImage} />
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-lg">
                            {getInitials(trainer.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-lg leading-tight truncate">{trainer.name}</h3>
                        <StarRating value={trainer.trainerProfile.rating.average} count={trainer.trainerProfile.rating.count} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { icon: Award, label: 'Exp.', value: trainer.trainerProfile.experience ? `${trainer.trainerProfile.experience}y` : 'N/A' },
                        { icon: Calendar, label: 'Sessions', value: trainer.trainerProfile.completedSessions || 0 },
                        { icon: DollarSign, label: '/hour', value: trainer.trainerProfile.hourlyRate ? `$${trainer.trainerProfile.hourlyRate}` : 'TBD' },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <Icon className="w-4 h-4 text-indigo-500 mx-auto mb-1" />
                          <p className="text-sm font-bold text-gray-900">{value}</p>
                          <p className="text-xs text-gray-400">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {trainer.trainerProfile.specializations.slice(0, 3).map((s, i) => (
                        <Badge key={i} variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 border-0">{s}</Badge>
                      ))}
                      {trainer.trainerProfile.specializations.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-500 border-0">
                          +{trainer.trainerProfile.specializations.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Bio snippet */}
                    {trainer.trainerProfile.bio && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                        {trainer.trainerProfile.bio}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-sm"
                        onClick={() => setSelectedTrainer(trainer)}>
                        View Profile
                      </Button>
                      <Button size="sm" className="flex-1 text-sm bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => handleBook(trainer)}>
                        Book Now <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                    {user?.userType === 'user' && (
                      <Button variant="ghost" size="sm" className="w-full mt-1.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setRequestTrainer(trainer)}>
                        <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" /> Request a Session
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Request Session Dialog */}
      <RequestSessionDialog
        open={!!requestTrainer}
        onOpenChange={o => !o && setRequestTrainer(null)}
        trainer={requestTrainer}
      />

      {/* Trainer Detail Modal */}
      <Dialog open={!!selectedTrainer} onOpenChange={o => !o && setSelectedTrainer(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          {selectedTrainer && (
            <>
              {/* Modal hero */}
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative">
                <button onClick={() => setSelectedTrainer(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-5">
                  <Avatar className="w-20 h-20 ring-4 ring-white/30 shadow-xl">
                    <AvatarImage src={selectedTrainer.trainerProfile.profileImage} />
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {getInitials(selectedTrainer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold mb-1">{selectedTrainer.name}</h2>
                    <StarRating value={selectedTrainer.trainerProfile.rating.average} count={selectedTrainer.trainerProfile.rating.count} />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  {[
                    { label: 'Experience', value: selectedTrainer.trainerProfile.experience ? `${selectedTrainer.trainerProfile.experience} yrs` : 'N/A' },
                    { label: 'Sessions', value: selectedTrainer.trainerProfile.completedSessions || 0 },
                    { label: 'Rating', value: selectedTrainer.trainerProfile.rating?.count ? selectedTrainer.trainerProfile.rating.average.toFixed(1) : 'New' },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-white/70 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-6">
                {/* About / Bio */}
                {selectedTrainer.trainerProfile.bio && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" /> About
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4 border border-gray-100">
                      {selectedTrainer.trainerProfile.bio}
                    </p>
                  </div>
                )}

                {/* Specializations */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" /> Specializations
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTrainer.trainerProfile.specializations.map((s, i) => (
                      <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">{s}</Badge>
                    ))}
                  </div>
                </div>

                {/* Certifications */}
                {selectedTrainer.trainerProfile.certifications.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-500" /> Certifications
                    </h3>
                    <div className="space-y-2">
                      {selectedTrainer.trainerProfile.certifications.map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Session types */}
                {selectedTrainer.trainerProfile.sessionTypes.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" /> Session Types & Pricing
                    </h3>
                    <div className="space-y-2">
                      {selectedTrainer.trainerProfile.sessionTypes.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div>
                            <p className="font-medium text-gray-900 capitalize">{s.type.replace(/-/g, ' ')}</p>
                            <p className="text-xs text-gray-500">{s.duration} min{s.description ? ` · ${s.description}` : ''}</p>
                          </div>
                          <span className="text-lg font-bold text-indigo-600">${s.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 flex items-center justify-between border border-indigo-100">
                  <div>
                    <p className="text-sm text-gray-500">Starting from</p>
                    {selectedTrainer.trainerProfile.hourlyRate ? (
                      <p className="text-3xl font-bold text-indigo-700">${selectedTrainer.trainerProfile.hourlyRate}<span className="text-base font-normal text-gray-400">/hr</span></p>
                    ) : (
                      <p className="text-lg font-semibold text-gray-500">Contact for pricing</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 px-6"
                      onClick={() => { setSelectedTrainer(null); handleBook(selectedTrainer); }}>
                      Book Session <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                    {user?.userType === 'user' && (
                      <Button variant="outline" size="sm" className="text-xs"
                        onClick={() => { setSelectedTrainer(null); setRequestTrainer(selectedTrainer); }}>
                        <MessageSquarePlus className="w-3.5 h-3.5 mr-1.5" /> Request a Session
                      </Button>
                    )}
                  </div>
                </div>

                {/* Real reviews from DB */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Client Reviews
                  </h3>
                  {modalReviewsLoading ? (
                    <div className="text-sm text-gray-400 text-center py-4">Loading reviews…</div>
                  ) : modalReviews.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                      <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No reviews yet</p>
                      <p className="text-xs text-gray-300 mt-0.5">Be the first to leave a review after your session</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {modalReviews.map((review: any, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-gray-800">
                              {review.clientId?.name || 'Client'}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-3.5 h-3.5 ${s <= review.feedback?.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                              ))}
                            </div>
                          </div>
                          {review.feedback?.comment && (
                            <p className="text-xs text-gray-600 leading-relaxed">"{review.feedback.comment}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1.5">
                            {new Date(review.feedback?.createdAt || review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Trainers;
