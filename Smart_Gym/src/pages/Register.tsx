import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Upload, FileText, File, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState<"user" | "trainer">("user");
  const [loading, setLoading] = useState(false);

  // User-specific fields
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [fitnessLevel, setFitnessLevel] = useState("beginner");
  const [fitnessGoals, setFitnessGoals] = useState<string[]>([]);
  const [newGoal, setNewGoal] = useState("");

  // Trainer-specific fields
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpecialization, setNewSpecialization] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCertification, setNewCertification] = useState("");
  const [experience, setExperience] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [bio, setBio] = useState("");

  // Verification documents (trainer only)
  interface DocFile { name: string; type: string; size: number; data: string; }
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [docDragging, setDocDragging] = useState(false);

  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB per file
  const MAX_FILES = 5;

  const commonGoals = [
    "Weight Loss",
    "Muscle Gain",
    "Improve Endurance",
    "Increase Flexibility",
    "General Fitness",
    "Sports Performance"
  ];

  const commonSpecializations = [
    "Weight Loss",
    "Strength Training",
    "HIIT",
    "Yoga",
    "Pilates",
    "CrossFit",
    "Bodybuilding",
    "Sports Training",
    "Rehabilitation",
    "Nutrition"
  ];

  const addGoal = (goal: string) => {
    if (goal && !fitnessGoals.includes(goal)) {
      setFitnessGoals([...fitnessGoals, goal]);
      setNewGoal("");
    }
  };

  const removeGoal = (goal: string) => {
    setFitnessGoals(fitnessGoals.filter(g => g !== goal));
  };

  const addSpecialization = (spec: string) => {
    if (spec && !specializations.includes(spec)) {
      setSpecializations([...specializations, spec]);
      setNewSpecialization("");
    }
  };

  const removeSpecialization = (spec: string) => {
    setSpecializations(specializations.filter(s => s !== spec));
  };

  const addCertification = () => {
    if (newCertification && !certifications.includes(newCertification)) {
      setCertifications([...certifications, newCertification]);
      setNewCertification("");
    }
  };

  const removeCertification = (cert: string) => {
    setCertifications(certifications.filter(c => c !== cert));
  };

  const processFiles = (files: FileList | File[]) => {
    const arr = Array.from(files);
    const remaining = MAX_FILES - documents.length;
    if (remaining <= 0) {
      toast({ title: "Limit reached", description: `Maximum ${MAX_FILES} documents allowed.`, variant: "destructive" });
      return;
    }
    arr.slice(0, remaining).forEach(file => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({ title: "Invalid file type", description: `${file.name}: only PDF, JPG, PNG allowed.`, variant: "destructive" });
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({ title: "File too large", description: `${file.name}: max 3MB per file.`, variant: "destructive" });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocuments(prev => [...prev, {
          name: file.name,
          type: file.type,
          size: file.size,
          data: reader.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (index: number) => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    // Trainer-specific validation
    if (userType === "trainer") {
      if (specializations.length === 0) {
        toast({
          title: "Missing Information",
          description: "Please add at least one specialization.",
          variant: "destructive",
        });
        return;
      }
      if (!experience || parseInt(experience) < 0) {
        toast({
          title: "Invalid Experience",
          description: "Please enter valid years of experience.",
          variant: "destructive",
        });
        return;
      }
      if (documents.length === 0) {
        toast({
          title: "Documents Required",
          description: "Please upload at least one verification document (certification or proof of achievement).",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Prepare registration data with profile information
      const registrationData: any = {
        name,
        email,
        password,
        userType,
      };

      // Add user-specific profile data
      if (userType === "user") {
        if (age) registrationData.age = age;
        if (height) registrationData.height = height;
        if (weight) registrationData.weight = weight;
        registrationData.fitnessLevel = fitnessLevel;
        registrationData.fitnessGoals = fitnessGoals;
      }

      // Add trainer-specific profile data
      if (userType === "trainer") {
        registrationData.bio = bio;
        registrationData.specializations = specializations;
        registrationData.certifications = certifications;
        registrationData.experience = experience;
        if (hourlyRate) registrationData.hourlyRate = hourlyRate;
        registrationData.documents = documents; // verification docs
      }

      await register(
        registrationData.name,
        registrationData.email,
        registrationData.password,
        registrationData.userType,
        registrationData
      );
      
      toast({
        title: "Account Created",
        description: userType === "trainer"
          ? "Your trainer account is pending admin approval."
          : "Welcome! Your account has been created successfully.",
      });
      
      if (userType === "trainer") {
        navigate("/pending-approval");
      } else {
        navigate("/user-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-heading font-bold">Create Account</h2>
          <p className="text-muted-foreground">Start your fitness journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User Type Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">I want to join as</Label>
            <RadioGroup 
              value={userType} 
              onValueChange={(value: "user" | "trainer") => setUserType(value)} 
              className="grid grid-cols-2 gap-4"
            >
              <div className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                userType === "user" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}>
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="font-normal cursor-pointer flex-1">
                  <div className="font-semibold">Member</div>
                  <div className="text-sm text-muted-foreground">Find trainers and workout plans</div>
                </Label>
              </div>
              <div className={`relative flex items-center space-x-3 rounded-lg border-2 p-4 cursor-pointer transition-all ${
                userType === "trainer" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}>
                <RadioGroupItem value="trainer" id="trainer" />
                <Label htmlFor="trainer" className="font-normal cursor-pointer flex-1">
                  <div className="font-semibold">Trainer</div>
                  <div className="text-sm text-muted-foreground">Offer coaching services</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          </div>

          {/* User-specific fields */}
          {userType === "user" && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Profile Information (Optional)</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    min="13"
                    max="120"
                  />
                </div>

                <div>
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    min="100"
                    max="250"
                  />
                </div>

                <div>
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    min="30"
                    max="300"
                  />
                </div>
              </div>

              <div>
                <Label>Fitness Level</Label>
                <RadioGroup value={fitnessLevel} onValueChange={setFitnessLevel} className="flex gap-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner" className="font-normal cursor-pointer">Beginner</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate" className="font-normal cursor-pointer">Intermediate</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced" className="font-normal cursor-pointer">Advanced</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Fitness Goals</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-3">
                  {commonGoals.map((goal) => (
                    <Badge
                      key={goal}
                      variant={fitnessGoals.includes(goal) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => fitnessGoals.includes(goal) ? removeGoal(goal) : addGoal(goal)}
                    >
                      {goal}
                    </Badge>
                  ))}
                </div>
                {fitnessGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {fitnessGoals.map((goal) => (
                      <Badge key={goal} variant="secondary">
                        {goal}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeGoal(goal)} />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Trainer-specific fields */}
          {userType === "trainer" && (
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              
              <div>
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about your training philosophy and experience..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Input
                    id="experience"
                    type="number"
                    placeholder="5"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    min="0"
                    max="50"
                  />
                </div>

                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    placeholder="50"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    min="0"
                  />
                </div>
              </div>

              <div>
                <Label>Specializations *</Label>
                <div className="flex flex-wrap gap-2 mt-2 mb-3">
                  {commonSpecializations.map((spec) => (
                    <Badge
                      key={spec}
                      variant={specializations.includes(spec) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => specializations.includes(spec) ? removeSpecialization(spec) : addSpecialization(spec)}
                    >
                      {spec}
                    </Badge>
                  ))}
                </div>
                {specializations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {specializations.map((spec) => (
                      <Badge key={spec} variant="secondary">
                        {spec}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeSpecialization(spec)} />
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom specialization..."
                    value={newSpecialization}
                    onChange={(e) => setNewSpecialization(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization(newSpecialization))}
                  />
                  <Button type="button" variant="outline" onClick={() => addSpecialization(newSpecialization)}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label>Certifications</Label>
                {certifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 mt-2">
                    {certifications.map((cert) => (
                      <Badge key={cert} variant="secondary">
                        {cert}
                        <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => removeCertification(cert)} />
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., NASM-CPT, ACE, ACSM..."
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                  />
                  <Button type="button" variant="outline" onClick={addCertification}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Verification Documents */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-base font-semibold">Verification Documents *</Label>
                  <Badge variant="destructive" className="text-xs">Required</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Upload certifications, diplomas, or proof of achievements. Accepted: PDF, JPG, PNG · Max 3MB each · Up to 5 files.
                </p>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDocDragging(true); }}
                  onDragLeave={() => setDocDragging(false)}
                  onDrop={e => { e.preventDefault(); setDocDragging(false); processFiles(e.dataTransfer.files); }}
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    docDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => document.getElementById('doc-upload')?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drop files here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG up to 3MB</p>
                  <input
                    id="doc-upload"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={e => e.target.files && processFiles(e.target.files)}
                  />
                </div>

                {/* File list */}
                {documents.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {documents.map((doc, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                        {doc.type === 'application/pdf'
                          ? <FileText className="w-5 h-5 text-red-500 shrink-0" />
                          : <File className="w-5 h-5 text-blue-500 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{formatBytes(doc.size)}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDocument(i)}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {documents.length === 0 && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                    <p className="text-xs text-yellow-700">At least one document is required for trainer verification.</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {documents.length}/{MAX_FILES} files uploaded
                </p>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating Account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Login
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Register;
