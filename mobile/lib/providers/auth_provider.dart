import 'package:flutter/foundation.dart';
import '../models/app_user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  AuthProvider(this.api);
  final ApiService api;
  AppUser? user;
  bool loading = true;
  String? error;

  bool get authenticated => user != null;

  Future<void> restore() async {
    loading = true;
    notifyListeners();
    try {
      if (await api.hasSession()) {
        final current = await api.me();
        if (current.role == 'OFFICER') user = current;
      }
    } catch (_) {
      await api.logout();
      user = null;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      user = await api.login(email, password);
      return true;
    } catch (exception) {
      error = exception.toString();
      return false;
    } finally {
      loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await api.logout();
    user = null;
    notifyListeners();
  }
}

