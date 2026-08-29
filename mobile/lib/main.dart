import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/complaint_provider.dart';
import 'screens/home_screen.dart';
import 'screens/login_screen.dart';
import 'services/api_service.dart';
import 'services/offline_database.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final api = ApiService();
  final database = OfflineDatabase();
  runApp(NwsdbOfficerApp(api: api, database: database));
}

class NwsdbOfficerApp extends StatelessWidget {
  const NwsdbOfficerApp({super.key, required this.api, required this.database});
  final ApiService api;
  final OfflineDatabase database;

  @override
  Widget build(BuildContext context) => MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider(api)..restore()),
          ChangeNotifierProvider(create: (_) => ComplaintProvider(api, database)),
          Provider.value(value: api),
        ],
        child: MaterialApp(
          title: 'NWSDB Field Operations',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0b5d4b), brightness: Brightness.light),
            scaffoldBackgroundColor: const Color(0xfff4f7f5),
            cardTheme: const CardThemeData(color: Colors.white, elevation: 0, shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(16)))),
            inputDecorationTheme: InputDecorationTheme(filled: true, fillColor: Colors.white, border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xffd8e2de))), enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xffd8e2de)))),
            elevatedButtonTheme: ElevatedButtonThemeData(style: ElevatedButton.styleFrom(backgroundColor: const Color(0xff0b5d4b), foregroundColor: Colors.white, minimumSize: const Size.fromHeight(49), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)), textStyle: const TextStyle(fontWeight: FontWeight.w800))),
          ),
          home: const AppGate(),
        ),
      );
}

class AppGate extends StatelessWidget {
  const AppGate({super.key});
  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    if (auth.loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return auth.authenticated ? const HomeScreen() : const LoginScreen();
  }
}

