import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/app_user.dart';
import '../models/complaint.dart';

class ApiException implements Exception {
  ApiException(this.message);
  final String message;
  @override
  String toString() => message;
}

class ApiService {
  ApiService()
      : baseUrl = const String.fromEnvironment(
          'API_BASE_URL',
          defaultValue: 'http://10.0.2.2:5000/api',
        ),
        _storage = const FlutterSecureStorage() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 12),
      receiveTimeout: const Duration(seconds: 20),
      headers: {'Accept': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(onRequest: (options, handler) async {
      final token = await _storage.read(key: 'token');
      if (token != null) options.headers['Authorization'] = 'Bearer $token';
      handler.next(options);
    }));
  }

  late final Dio _dio;
  final FlutterSecureStorage _storage;
  final String baseUrl;

  String absolutePhotoUrl(String value) {
    if (value.startsWith('http')) return value;
    return '${baseUrl.replaceFirst(RegExp(r'/api$'), '')}$value';
  }

  Future<AppUser> login(String email, String password) async {
    try {
      final response = await _dio.post('/auth/login', data: {'email': email, 'password': password});
      final data = response.data as Map<String, dynamic>;
      final user = AppUser.fromJson(data['user'] as Map<String, dynamic>);
      if (user.role != 'OFFICER') throw ApiException('Use a field-officer account in the mobile application.');
      await _storage.write(key: 'token', value: data['token'] as String);
      return user;
    } on DioException catch (error) {
      throw ApiException(_message(error));
    }
  }

  Future<AppUser> me() async {
    try {
      final response = await _dio.get('/auth/me');
      return AppUser.fromJson((response.data as Map<String, dynamic>)['user'] as Map<String, dynamic>);
    } on DioException catch (error) { throw ApiException(_message(error)); }
  }

  Future<bool> hasSession() async => (await _storage.read(key: 'token')) != null;
  Future<void> logout() => _storage.delete(key: 'token');

  Future<List<Complaint>> listComplaints({String? status}) async {
    try {
      final response = await _dio.get('/complaints', queryParameters: {'limit': 100, if (status != null) 'status': status});
      final items = (response.data as Map<String, dynamic>)['complaints'] as List<dynamic>;
      return items.map((item) => Complaint.fromJson(item as Map<String, dynamic>)).toList();
    } on DioException catch (error) { throw ApiException(_message(error)); }
  }

  Future<Complaint> getComplaint(String id) async {
    try {
      final response = await _dio.get('/complaints/$id');
      return Complaint.fromJson((response.data as Map<String, dynamic>)['complaint'] as Map<String, dynamic>);
    } on DioException catch (error) { throw ApiException(_message(error)); }
  }

  Future<void> uploadResolutionPhoto(String complaintId, String filePath) async {
    final file = File(filePath);
    if (!await file.exists()) throw ApiException('The selected completion photo is no longer available.');
    try {
      final form = FormData.fromMap({
        'type': 'resolution',
        'photo': await MultipartFile.fromFile(filePath, filename: file.uri.pathSegments.last),
      });
      await _dio.post('/complaints/$complaintId/photos', data: form);
    } on DioException catch (error) { throw ApiException(_message(error)); }
  }

  Future<void> updateStatus(String complaintId, String status, String notes) async {
    try {
      await _dio.patch('/complaints/$complaintId/status', data: {'status': status, 'notes': notes});
    } on DioException catch (error) { throw ApiException(_message(error)); }
  }

  String _message(DioException error) {
    final body = error.response?.data;
    if (body is Map<String, dynamic> && body['message'] != null) return body['message'].toString();
    if (error.type == DioExceptionType.connectionError || error.type == DioExceptionType.connectionTimeout) {
      return 'Cannot reach the NWSDB server. Check the connection and API address.';
    }
    return error.message ?? 'The request could not be completed.';
  }
}

