// models.dart
// Data models matching Supabase table shapes

class Question {
  final String questionId;
  final String? questionText;
  final String? questionImgUrl;
  final String? optionA, optionB, optionC, optionD;
  final String? optionAImg, optionBImg, optionCImg, optionDImg;
  final String? correctOption;
  final String? solution;
  final String? buddyJeetu, buddyRiya, buddyRei, buddyRitu, buddyShreya, buddyNeha;
  final String? subject;
  final String? chapter;
  final String? examShift;
  final double? difficultyLevel;

  const Question({
    required this.questionId,
    this.questionText,
    this.questionImgUrl,
    this.optionA, this.optionB, this.optionC, this.optionD,
    this.optionAImg, this.optionBImg, this.optionCImg, this.optionDImg,
    this.correctOption,
    this.solution,
    this.buddyJeetu, this.buddyRiya, this.buddyRei, this.buddyRitu,
    this.buddyShreya, this.buddyNeha,
    this.subject,
    this.chapter,
    this.examShift,
    this.difficultyLevel,
  });

  factory Question.fromJson(Map<String, dynamic> j) => Question(
    questionId:   j['question_id']    as String? ?? '',
    questionText: j['question_text']  as String?,
    questionImgUrl: j['question_img_url'] as String?,
    optionA:  j['option_a']  as String?,
    optionB:  j['option_b']  as String?,
    optionC:  j['option_c']  as String?,
    optionD:  j['option_d']  as String?,
    optionAImg: j['option_a_img'] as String?,
    optionBImg: j['option_b_img'] as String?,
    optionCImg: j['option_c_img'] as String?,
    optionDImg: j['option_d_img'] as String?,
    correctOption: j['correct_option'] as String?,
    solution: j['solution'] as String?,
    buddyJeetu: j['buddy_jeetu'] as String?,
    buddyRiya:  j['buddy_riya']  as String?,
    buddyRei:   j['buddy_rei']   as String?,
    buddyRitu:  j['buddy_ritu']  as String?,
    buddyShreya: j['buddy_shreya'] as String?,
    buddyNeha:  j['buddy_neha']  as String?,
    subject:    j['subject']     as String?,
    chapter:    j['chapter']     as String?,
    examShift:  j['exam_shift']  as String?,
    difficultyLevel: (j['difficulty_level'] as num?)?.toDouble(),
  );

  bool get isInteger =>
      optionA == null && optionB == null && optionC == null && optionD == null &&
      optionAImg == null && optionBImg == null && optionCImg == null && optionDImg == null;

  String? buddySolution(String buddyId) {
    switch (buddyId) {
      case '1': return buddyJeetu;
      case '2': return buddyRiya;
      case '3': return buddyRei;
      case '4': return buddyRitu;
      case '5': return buddyShreya;
      case '6': return buddyNeha;
      default:  return buddyRitu;
    }
  }
}

class StreakData {
  final int current;
  final int longest;
  final List<String> activeDays; // 'YYYY-M-D' format

  const StreakData({
    this.current = 0,
    this.longest = 0,
    this.activeDays = const [],
  });

  factory StreakData.fromJson(Map<String, dynamic> j) => StreakData(
    current: j['current'] as int? ?? 0,
    longest: j['longest'] as int? ?? 0,
    activeDays: (j['activeDays'] as List<dynamic>?)?.cast<String>() ?? [],
  );

  Map<String, dynamic> toJson() => {
    'current': current,
    'longest': longest,
    'activeDays': activeDays,
  };
}

class RookieUser {
  final String id;
  final String? email;
  final String? name;
  final String? exam;
  final String? cl;
  final String? phone;
  final int rookieCoins;

  const RookieUser({
    required this.id,
    this.email,
    this.name,
    this.exam,
    this.cl,
    this.phone,
    this.rookieCoins = 0,
  });

  factory RookieUser.fromJson(Map<String, dynamic> j) => RookieUser(
    id:    j['id']    as String? ?? '',
    email: j['email'] as String?,
    name:  j['name']  as String?,
    exam:  j['exam']  as String?,
    cl:    j['cl']    as String?,
    phone: j['phone'] as String?,
    rookieCoins: j['rookieCoinsEarned'] as int? ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'email': email,
    'name': name,
    'exam': exam,
    'cl': cl,
    'phone': phone,
    'rookieCoinsEarned': rookieCoins,
  };

  String? get firstName => name?.split(' ').first;
}
